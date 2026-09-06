import type { Sandbox as DaytonaSandbox } from "@daytonaio/sdk";
import { Effect, Option, Schema } from "effect";
import type { ResumableCommands } from "../../ports/sandbox";
import { cdInto, sessionName, unavailable, uploadedEnv } from "./daytona-shell";
import { envFileFor, sourcing } from "./env-file";

/* The SDK types this as `any` and returns one of two shapes, so it is decoded
   rather than asserted. */
const SessionLogs = Schema.Struct({
  stderr: Schema.optional(Schema.String),
  stdout: Schema.optional(Schema.String),
});

const decodeLogs = Schema.decodeUnknownOption(SessionLogs);

export const logsOf = (logs: unknown, stream: "stdout" | "stderr") =>
  decodeLogs(logs).pipe(
    Option.flatMapNullable((decoded) => decoded[stream]),
    Option.getOrElse(() => "")
  );

/* Daytona sessions survive the request that created them, so a half-hour install
   can be started, left, and polled. */
export const detachedCommands = (
  sandbox: DaytonaSandbox,
  workspace: string
): ResumableCommands => ({
  progress: (started) =>
    Effect.all({
      command: Effect.tryPromise({
        catch: unavailable,
        try: () =>
          sandbox.process.getSessionCommand(started.session, started.id),
      }),
      logs: Effect.tryPromise({
        catch: unavailable,
        try: () =>
          sandbox.process.getSessionCommandLogs(started.session, started.id),
      }),
    }).pipe(
      Effect.map(({ command, logs }) => ({
        exitCode: command.exitCode ?? null,
        stderr: logsOf(logs, "stderr"),
        stdout: logsOf(logs, "stdout"),
      }))
    ),

  /* Deliberately not scoped: a released session takes its command with it.
     Deleting the sandbox takes its sessions, which bounds them. */
  start: (command, options) =>
    Effect.gen(function* () {
      const id = yield* sessionName;

      yield* Effect.tryPromise({
        catch: unavailable,
        try: () => sandbox.process.createSession(id),
      });

      const envFile = yield* envFileFor(options?.env);
      yield* uploadedEnv(sandbox, envFile);

      const started = yield* Effect.tryPromise({
        catch: unavailable,
        try: () =>
          sandbox.process.executeSessionCommand(id, {
            command: cdInto(
              options?.cwd ?? workspace,
              sourcing(envFile, command)
            ),
            runAsync: true,
          }),
      });

      return { id: started.cmdId ?? "", session: id };
    }),
});

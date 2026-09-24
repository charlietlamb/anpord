import type { Sandbox as DaytonaSandbox } from "@daytonaio/sdk";
import { Effect, Option, Schema } from "effect";
import type { ResumableCommands } from "../../ports/sandbox";
import { call, sessionName, startSessionCommand } from "./daytona-shell";

const decodeLogs = Schema.decodeUnknownOption(
  Schema.Struct({
    stderr: Schema.optional(Schema.String),
    stdout: Schema.optional(Schema.String),
  })
);

export const logsOf = (logs: unknown, stream: "stdout" | "stderr") =>
  decodeLogs(logs).pipe(
    Option.flatMapNullable((decoded) => decoded[stream]),
    Option.getOrElse(() => "")
  );

export const detachedCommands = (
  sandbox: DaytonaSandbox,
  workspace: string
): ResumableCommands => ({
  progress: (started) =>
    Effect.all(
      {
        command: call(() =>
          sandbox.process.getSessionCommand(started.session, started.id)
        ),
        logs: call(() =>
          sandbox.process.getSessionCommandLogs(started.session, started.id)
        ),
      },
      { concurrency: "unbounded" }
    ).pipe(
      Effect.map(({ command, logs }) => ({
        exitCode: command.exitCode ?? null,
        stderr: logsOf(logs, "stderr"),
        stdout: logsOf(logs, "stdout"),
      }))
    ),
  start: (command, options) =>
    Effect.gen(function* () {
      const session = yield* sessionName;

      yield* call(() => sandbox.process.createSession(session));

      const id = yield* startSessionCommand(
        sandbox,
        workspace,
        session,
        command,
        options
      );

      return { id, session };
    }),
});

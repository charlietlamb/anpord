import type { Sandbox as DaytonaSandbox } from "@daytonaio/sdk";
import { Duration, Effect, Schedule } from "effect";
import type { ResumableCommands, SandboxHandle } from "../../ports/sandbox";
import { detachedCommands } from "./daytona-detached";
import {
  cdInto,
  DEFAULT_TIMEOUT_MS,
  sessionName,
  unavailable,
  uploadedEnv,
} from "./daytona-shell";
import { envFileFor, sourcing } from "./env-file";
import { execStream } from "./exec-stream";

const EXIT_POLL_MS = 250;

export const sessionCommands = (
  sandbox: DaytonaSandbox,
  workspace: string
): Pick<SandboxHandle, "exec"> & { readonly resumable: ResumableCommands } => {
  const session = (id: string) =>
    Effect.acquireRelease(
      Effect.tryPromise({
        catch: unavailable,
        try: () => sandbox.process.createSession(id),
      }).pipe(Effect.as(id)),
      () =>
        Effect.promise(() => sandbox.process.deleteSession(id)).pipe(
          Effect.ignore
        )
    );

  const exitCodeOf = (
    sessionId: string,
    commandId: string,
    deadlineMs: number
  ) =>
    Effect.tryPromise({
      catch: unavailable,
      try: () => sandbox.process.getSessionCommand(sessionId, commandId),
    }).pipe(
      Effect.map((command) => command.exitCode),
      Effect.flatMap((code) =>
        code === undefined || code === null
          ? Effect.fail(unavailable("the command is still running"))
          : Effect.succeed(code)
      ),
      Effect.retry(
        Schedule.spaced(Duration.millis(EXIT_POLL_MS)).pipe(
          Schedule.upTo(Duration.millis(deadlineMs))
        )
      )
    );

  return {
    exec: (command, options) =>
      execStream((sink) => {
        const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

        return Effect.gen(function* () {
          const sessionId = yield* sessionName;
          yield* session(sessionId);

          const envFile = yield* envFileFor(options?.env);
          yield* uploadedEnv(sandbox, envFile);

          const started = yield* Effect.tryPromise({
            catch: unavailable,
            try: () =>
              sandbox.process.executeSessionCommand(sessionId, {
                command: cdInto(
                  options?.cwd ?? workspace,
                  sourcing(envFile, command)
                ),
                runAsync: true,
              }),
          });

          const commandId = started.cmdId ?? "";

          yield* Effect.tryPromise({
            catch: unavailable,
            try: () =>
              sandbox.process.getSessionCommandLogs(
                sessionId,
                commandId,
                sink.stdout,
                sink.stderr
              ),
          });

          return yield* exitCodeOf(sessionId, commandId, timeoutMs);
        }).pipe(
          Effect.scoped,
          Effect.timeoutFail({
            duration: Duration.millis(timeoutMs),
            onTimeout: () => unavailable("the command timed out"),
          })
        );
      }),
    resumable: detachedCommands(sandbox, workspace),
  };
};

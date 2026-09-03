import type { Sandbox as DaytonaSandbox } from "@daytonaio/sdk";
import { Clock, Duration, Effect, Random, Schedule } from "effect";
import type { SandboxHandle } from "../../ports/sandbox";
import { cdInto, DEFAULT_TIMEOUT_MS, unavailable } from "./daytona-shell";
import { execStream } from "./exec-stream";

const EXIT_POLL_MS = 250;

const logsOf = (logs: unknown, stream: "stdout" | "stderr") => {
  const value = (logs as Record<string, unknown> | null)?.[stream];

  return typeof value === "string" ? value : "";
};

/* The clock alone is not enough: trials run concurrently and two commands
   starting in the same millisecond would name one session, where the second
   createSession either fails or attaches to the first and polls its logs. */
const sessionName = Effect.gen(function* () {
  const at = yield* Clock.currentTimeMillis;
  const salt = yield* Random.nextIntBetween(0, 1_000_000);

  return `anpord-${at}-${salt}`;
});

export const sessionCommands = (
  sandbox: DaytonaSandbox,
  workspace: string
): Pick<SandboxHandle, "exec" | "progress" | "start"> => {
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

          const started = yield* Effect.tryPromise({
            catch: unavailable,
            try: () =>
              sandbox.process.executeSessionCommand(sessionId, {
                command: cdInto(
                  options?.cwd ?? workspace,
                  command,
                  options?.env
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

    /* The session is deliberately not released with the calling scope, unlike
       exec's: the point of starting detached is that the command outlives the
       process that asked for it, and a released session takes the command with
       it. Deleting the sandbox takes its sessions, which bounds them. */
    start: (command, options) =>
      Effect.gen(function* () {
        const id = yield* sessionName;

        yield* Effect.tryPromise({
          catch: unavailable,
          try: () => sandbox.process.createSession(id),
        });

        const started = yield* Effect.tryPromise({
          catch: unavailable,
          try: () =>
            sandbox.process.executeSessionCommand(id, {
              command: cdInto(options?.cwd ?? workspace, command, options?.env),
              runAsync: true,
            }),
        });

        return { id: started.cmdId ?? "", session: id };
      }),
  };
};

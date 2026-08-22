import { Daytona, type Sandbox as DaytonaSandbox } from "@daytonaio/sdk";
import { Clock, Duration, Effect, Schedule } from "effect";
import { SandboxUnavailable } from "../../domain/errors";
import type {
  ExecOptions,
  OpenSandbox,
  SandboxAdapterShape,
  SandboxHandle,
} from "../../ports/sandbox";
import { execStream } from "./exec-stream";

const HOME = "/home/daytona";
const DEFAULT_TIMEOUT_MS = 120_000;
const AUTO_DELETE_FACTOR = 6;

/**
 * Daytona resolves the working directory before spawning a shell, so a command
 * whose cwd does not exist yet fails to *start* rather than failing to run: it
 * returns `fork/exec /usr/bin/zsh: no such file or directory` with exit -1 and
 * nothing executes. Commands therefore run from a directory known to exist and
 * change directory inside the command instead.
 */
const cdInto = (workspace: string, command: string) =>
  /* The cd must fail loudly. Swallowing it with `|| true` runs the verifier in
     the home directory instead, where a test runner finds no tests, exits
     zero, and the trial is recorded as a pass having tested nothing. */
  `cd ${workspace} && ${command}`;

const unavailable = (reason: unknown) =>
  new SandboxUnavailable({
    provider: "daytona",
    reason: reason instanceof Error ? reason.message : String(reason),
  });

/* Polled after the log stream ends, because the stream closes without saying
   how the command exited. */
const EXIT_POLL_MS = 250;

const handleFor = (
  sandbox: DaytonaSandbox,
  workspace: string
): SandboxHandle => {
  const execute = (command: string, options?: ExecOptions) =>
    Effect.tryPromise({
      catch: unavailable,
      try: () =>
        sandbox.process.executeCommand(
          cdInto(options?.cwd ?? workspace, command),
          HOME,
          options?.env,
          Math.ceil((options?.timeoutMs ?? DEFAULT_TIMEOUT_MS) / 1000)
        ),
    });

  /* A session per command, released whatever happens. Daytona only streams
     logs for a session command, and a session that outlives its command is a
     resource left behind on someone else's machine. */
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
      /* Bounded by the caller's own deadline rather than a fixed count.

         Measured: for a command running 300 seconds the log stream returned
         at 181 with the process still going and no exit code recorded, so
         the stream ending is not the command ending. A fixed budget gave up
         on a live command and reported it as unavailable. */
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
          /* Unique per command, and taken from the clock rather than a
             counter so two sandboxes in one process cannot collide. */
          const sessionId = `anpord-${yield* Clock.currentTimeMillis}`;
          yield* session(sessionId);

          const started = yield* Effect.tryPromise({
            catch: unavailable,
            try: () =>
              sandbox.process.executeSessionCommand(sessionId, {
                command: cdInto(options?.cwd ?? workspace, command),
                /* Asynchronous, so the logs can be followed while it runs.
                   A synchronous call returns only when it is over, which is
                   what made every chunk arrive at the same moment. */
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
    id: sandbox.id,
    provider: "daytona",
    streaming: true,
    writeFile: (path, content) =>
      /* A heredoc rather than the files API, because it keeps content intact
         where an echo would eat backslashes and quotes. Written with the
         plain call: it produces no output worth timing, and a session per
         file would be a session per fixture. */
      execute(
        `mkdir -p "$(dirname ${path})" && cat > ${path} <<'ANPORD_EOF'\n${content}\nANPORD_EOF`
      ).pipe(Effect.asVoid),
  };
};

export const makeDaytonaAdapter = Effect.sync((): SandboxAdapterShape => {
  const daytona = new Daytona();

  return {
    attach: (id) =>
      Effect.tryPromise({
        catch: unavailable,
        try: () => daytona.get(id),
      }).pipe(Effect.map((sandbox) => handleFor(sandbox, "/tmp/anpord"))),
    destroy: (handle) =>
      Effect.tryPromise({
        catch: unavailable,
        try: async () => {
          const sandbox = await daytona.get(handle.id);
          await sandbox.delete();
        },
      }),
    open: (request: OpenSandbox) =>
      Effect.tryPromise({
        catch: unavailable,
        try: () =>
          daytona.create({
            /** Two TTLs, because compensation does not run when a workflow
             * is interrupted rather than failed. */
            autoDeleteInterval: request.autoStopMinutes * AUTO_DELETE_FACTOR,
            autoStopInterval: request.autoStopMinutes,
          }),
      }).pipe(
        Effect.tap((sandbox) =>
          Effect.tryPromise({
            catch: unavailable,
            try: () =>
              sandbox.process.executeCommand(
                `mkdir -p ${request.workspace}`,
                HOME,
                undefined,
                30
              ),
          })
        ),
        Effect.map((sandbox) => handleFor(sandbox, request.workspace))
      ),
    provider: "daytona",
  };
});

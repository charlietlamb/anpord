import { Daytona, type Sandbox as DaytonaSandbox } from "@daytonaio/sdk";
import { Effect, Stream } from "effect";
import { SandboxUnavailable } from "../domain/errors";
import type {
  ExecOptions,
  OpenSandbox,
  SandboxAdapterShape,
  SandboxHandle,
} from "../ports/sandbox";

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

const handleFor = (
  sandbox: DaytonaSandbox,
  workspace: string
): SandboxHandle => {
  const exec = (command: string, options?: ExecOptions) =>
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

  return {
    exec: (command, options) =>
      /* Daytona returns a completed result rather than a live stream, so the
         chunks are synthesised. The exit code still travels in the stream so
         callers cannot tell the providers apart. */
      Stream.fromEffect(exec(command, options)).pipe(
        Stream.flatMap((result) =>
          Stream.make(
            { data: result.result ?? "", stream: "stdout" } as const,
            { exitCode: result.exitCode ?? 0, stream: "exit" } as const
          )
        )
      ),
    id: sandbox.id,
    provider: "daytona",
    writeFile: (path, content) =>
      /* A heredoc rather than the files API, because it keeps content intact
         where an echo would eat backslashes and quotes. */
      exec(
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

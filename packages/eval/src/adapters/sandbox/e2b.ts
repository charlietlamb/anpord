import { Sandbox as E2BSandbox } from "e2b";
import { Effect } from "effect";
import { SandboxUnavailable } from "../../domain/errors";
import type {
  ExecOptions,
  OpenSandbox,
  SandboxAdapterShape,
  SandboxHandle,
} from "../../ports/sandbox";
import { execStream } from "./exec-stream";

const DEFAULT_TIMEOUT_MS = 120_000;

interface CommandResult {
  readonly exitCode: number;
  readonly stderr: string;
  readonly stdout: string;
}

/** The shape this SDK rejects with when a command exits non-zero: the output
 * hangs off `result` rather than off the error itself. Returns null when the
 * rejection is anything else, which is a genuine provider failure and belongs
 * in the error channel. */
const asCommandResult = (rejection: unknown): CommandResult | null => {
  const carried = (rejection as { result?: unknown })?.result;
  const source = (carried ?? rejection) as {
    exitCode?: number;
    stderr?: string;
    stdout?: string;
  };

  return typeof source?.exitCode === "number"
    ? {
        exitCode: source.exitCode,
        stderr: source.stderr ?? "",
        stdout: source.stdout ?? "",
      }
    : null;
};

const unavailable = (reason: unknown) =>
  new SandboxUnavailable({
    provider: "e2b",
    reason: reason instanceof Error ? reason.message : String(reason),
  });

const handleFor = (sandbox: E2BSandbox, workspace: string): SandboxHandle => ({
  exec: (command, options?: ExecOptions) =>
    execStream((sink) =>
      Effect.tryPromise({
        catch: unavailable,
        /** The fold happens inside `try`, before the rejection is turned
         * into a SandboxUnavailable. */
        try: () =>
          sandbox.commands
            .run(command, {
              cwd: options?.cwd ?? workspace,
              envs: options?.env as Record<string, string> | undefined,
              /* Output arrives here as it is produced, which is what makes
                 the timestamps mean anything. Reading it off the resolved
                 result instead gave every chunk the moment the command
                 finished, so a five second command measured as zero. */
              onStderr: sink.stderr,
              onStdout: sink.stdout,
              timeoutMs: options?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
            })
            .catch((rejection: unknown) => {
              const failed = asCommandResult(rejection);

              /* A non-zero exit is data, not an error. Rethrowing here would
                 lose the very thing being measured. */
              if (failed === null) {
                throw rejection;
              }

              return failed;
            }),
      }).pipe(Effect.map((result) => result.exitCode))
    ),
  id: sandbox.sandboxId,
  provider: "e2b",
  streaming: true,
  writeFile: (path, content) =>
    Effect.tryPromise({
      catch: unavailable,
      try: () => sandbox.files.write(path, content),
    }).pipe(Effect.asVoid),
});

export const makeE2BAdapter = Effect.sync(
  (): SandboxAdapterShape => ({
    attach: (id) =>
      Effect.tryPromise({
        catch: unavailable,
        try: () => E2BSandbox.connect(id),
      }).pipe(Effect.map((sandbox) => handleFor(sandbox, "/tmp/anpord"))),
    destroy: (handle) =>
      Effect.tryPromise({
        catch: unavailable,
        try: async () => {
          const sandbox = await E2BSandbox.connect(handle.id);
          await sandbox.kill();
        },
      }).pipe(Effect.asVoid),
    open: (request: OpenSandbox) =>
      Effect.tryPromise({
        catch: unavailable,
        try: () =>
          E2BSandbox.create({ timeoutMs: request.autoStopMinutes * 60_000 }),
      }).pipe(
        Effect.tap((sandbox) =>
          Effect.tryPromise({
            catch: unavailable,
            try: () => sandbox.commands.run(`mkdir -p ${request.workspace}`),
          })
        ),
        Effect.map((sandbox) => handleFor(sandbox, request.workspace))
      ),
    provider: "e2b",
  })
);

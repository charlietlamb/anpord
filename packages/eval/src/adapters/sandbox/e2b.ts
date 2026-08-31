import { Sandbox as E2BSandbox } from "e2b";
import { Effect } from "effect";
import { sandboxUnavailable } from "../../domain/errors";
import type {
  ExecOptions,
  OpenSandbox,
  SandboxAdapterShape,
  SandboxHandle,
} from "../../ports/sandbox";
import { execStream } from "./exec-stream";
import { notResumable } from "./not-resumable";

const DEFAULT_TIMEOUT_MS = 120_000;
const HOME = "/home/user";

interface CommandResult {
  readonly exitCode: number;
  readonly stderr: string;
  readonly stdout: string;
}

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

const unavailable = (reason: unknown) => sandboxUnavailable("e2b", reason);

const handleFor = (sandbox: E2BSandbox, workspace: string): SandboxHandle => ({
  exec: (command, options?: ExecOptions) =>
    execStream((sink) =>
      Effect.tryPromise({
        catch: unavailable,
        try: () =>
          sandbox.commands
            .run(command, {
              cwd: options?.cwd ?? workspace,
              envs: options?.env as Record<string, string> | undefined,
              onStderr: sink.stderr,
              onStdout: sink.stdout,
              timeoutMs: options?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
            })
            .catch((rejection: unknown) => {
              const failed = asCommandResult(rejection);

              if (failed === null) {
                throw rejection;
              }

              return failed;
            }),
      }).pipe(Effect.map((result) => result.exitCode))
    ),
  id: sandbox.sandboxId,
  home: HOME,
  provider: "e2b",
  ...notResumable("e2b"),
  streaming: true,
  writeFile: (path, content) =>
    Effect.tryPromise({
      catch: unavailable,
      try: () => sandbox.files.write(path, content),
    }).pipe(Effect.asVoid),
});

export const makeConfiguredE2BAdapter = (
  values?: Readonly<Record<string, string>>
) =>
  Effect.sync(
    (): SandboxAdapterShape => ({
      attach: (id) =>
        Effect.tryPromise({
          catch: unavailable,
          try: () => E2BSandbox.connect(id, { apiKey: values?.apiKey }),
        }).pipe(Effect.map((sandbox) => handleFor(sandbox, "/tmp/anpord"))),
      destroy: (handle) =>
        Effect.tryPromise({
          catch: unavailable,
          try: async () => {
            const sandbox = await E2BSandbox.connect(handle.id, {
              apiKey: values?.apiKey,
            });
            await sandbox.kill();
          },
        }).pipe(Effect.asVoid),
      open: (request: OpenSandbox) =>
        Effect.tryPromise({
          catch: unavailable,
          try: () =>
            E2BSandbox.create({
              apiKey: values?.apiKey,
              timeoutMs: request.autoStopMinutes * 60_000,
            }),
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

export const makeE2BAdapter = makeConfiguredE2BAdapter();

import { Effect } from "effect";
import { ModalClient, type ModalReadStream, type Sandbox } from "modal";
import { sandboxUnavailable } from "../../domain/errors";
import type {
  OpenSandbox,
  SandboxAdapterShape,
  SandboxHandle,
} from "../../ports/sandbox";
import { execStream } from "./exec-stream";
import { noCache, notResumable } from "./not-resumable";

const APP = "anpord-evals";
const HOME = "/root";
const IMAGE = "node:22-bookworm";
const WORKSPACE = "/tmp/anpord";
const DEFAULT_TIMEOUT_MS = 120_000;

const unavailable = (reason: unknown) => sandboxUnavailable("modal", reason);

const drain = async (
  stream: ModalReadStream<string>,
  emit: (chunk: string) => void
) => {
  const reader = stream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      return;
    }
    emit(value);
  }
};

const handleFor = (sandbox: Sandbox, workspace: string): SandboxHandle => ({
  exec: (command, options) =>
    execStream((sink) =>
      Effect.tryPromise({
        catch: unavailable,
        try: async () => {
          const process = await sandbox.exec(["bash", "-lc", command], {
            env: options?.env ? { ...options.env } : undefined,
            timeoutMs: options?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
            workdir: options?.cwd ?? workspace,
          });
          const [, , exitCode] = await Promise.all([
            drain(process.stdout, sink.stdout),
            drain(process.stderr, sink.stderr),
            process.wait(),
          ]);
          return exitCode;
        },
      })
    ),
  home: HOME,
  id: sandbox.sandboxId,
  provider: "modal",
  ...noCache,
  ...notResumable("modal"),
  streaming: true,
  writeFile: (path, content) =>
    Effect.tryPromise({
      catch: unavailable,
      try: () => sandbox.filesystem.writeText(content, path),
    }),
});

export const makeConfiguredModalAdapter = (
  values?: Readonly<Record<string, string>>
) =>
  Effect.sync<SandboxAdapterShape>(() => {
    const modal = new ModalClient(
      values?.tokenId && values.tokenSecret
        ? { tokenId: values.tokenId, tokenSecret: values.tokenSecret }
        : undefined
    );
    const image = modal.images.fromRegistry(IMAGE);

    return {
      attach: (id) =>
        Effect.tryPromise({
          catch: unavailable,
          try: () => modal.sandboxes.fromId(id),
        }).pipe(Effect.map((sandbox) => handleFor(sandbox, WORKSPACE))),
      destroy: (handle) =>
        Effect.tryPromise({
          catch: unavailable,
          try: async () => {
            const sandbox = await modal.sandboxes.fromId(handle.id);
            await sandbox.terminate({ wait: true });
          },
        }),
      open: (request: OpenSandbox) =>
        Effect.tryPromise({
          catch: unavailable,
          try: async () => {
            const app = await modal.apps.fromName(APP, {
              createIfMissing: true,
            });
            return modal.sandboxes.create(app, image, {
              idleTimeoutMs: request.autoStopMinutes * 60_000,
              timeoutMs: request.autoStopMinutes * 60_000,
            });
          },
        }).pipe(
          Effect.flatMap((sandbox) =>
            Effect.tryPromise({
              catch: unavailable,
              try: () =>
                sandbox.filesystem.makeDirectory(request.workspace, {
                  createParents: true,
                }),
            }).pipe(
              Effect.as(handleFor(sandbox, request.workspace)),
              Effect.tapError(() =>
                Effect.promise(() => sandbox.terminate()).pipe(Effect.ignore)
              )
            )
          )
        ),
      provider: "modal",
    };
  });

export const makeModalAdapter = makeConfiguredModalAdapter();

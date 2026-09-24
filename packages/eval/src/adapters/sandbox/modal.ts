import { Effect, Option, Stream } from "effect";
import { ModalClient, type ModalReadStream, type Sandbox } from "modal";
import type { SandboxHandle } from "../../ports/sandbox";
import { execStream } from "./exec-stream";
import {
  DEFAULT_TIMEOUT_MS,
  type MakeAdapter,
  providerAdapter,
  providerCall,
  unavailableFor,
} from "./provider-adapter";

const APP = "anpord-evals";
const HOME = "/root";
const IMAGE = "node:22-bookworm";

const call = providerCall("modal");

const drain = (
  stream: ModalReadStream<string>,
  emit: (chunk: string) => void
) =>
  Stream.fromReadableStream(() => stream, unavailableFor("modal")).pipe(
    Stream.runForEach((chunk) => Effect.sync(() => emit(chunk)))
  );

const handleFor = (sandbox: Sandbox, workspace: string): SandboxHandle => ({
  cache: Option.none(),
  exec: (command, options) =>
    execStream((sink) =>
      call(() =>
        sandbox.exec(["bash", "-lc", command], {
          env: options?.env && { ...options.env },
          timeoutMs: options?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
          workdir: options?.cwd ?? workspace,
        })
      ).pipe(
        Effect.flatMap((process) =>
          Effect.all(
            [
              drain(process.stdout, sink.stdout),
              drain(process.stderr, sink.stderr),
              call(() => process.wait()),
            ],
            { concurrency: "unbounded" }
          )
        ),
        Effect.map(([, , exitCode]) => exitCode)
      )
    ),
  home: HOME,
  id: sandbox.sandboxId,
  provider: "modal",
  resumable: Option.none(),
  writeFile: (path, content) =>
    call(() => sandbox.filesystem.writeText(content, path)),
});

export const modalAdapter: MakeAdapter = (values) =>
  Effect.sync(() => {
    const modal = new ModalClient(
      values?.tokenId && values.tokenSecret
        ? { tokenId: values.tokenId, tokenSecret: values.tokenSecret }
        : undefined
    );
    const image = modal.images.fromRegistry(IMAGE);

    return providerAdapter({
      connect: (id) => call(() => modal.sandboxes.fromId(id)),
      create: (request) =>
        call(async () => {
          const app = await modal.apps.fromName(APP, { createIfMissing: true });
          return modal.sandboxes.create(app, image, {
            idleTimeoutMs: request.autoStopMinutes * 60_000,
            timeoutMs: request.autoStopMinutes * 60_000,
          });
        }),
      destroy: (id) =>
        call(async () => {
          const sandbox = await modal.sandboxes.fromId(id);
          await sandbox.terminate({ wait: true });
        }),
      discard: (sandbox) => call(() => sandbox.terminate()),
      handleFor,
      home: HOME,
      makeWorkspace: (sandbox, workspace) =>
        call(() =>
          sandbox.filesystem.makeDirectory(workspace, { createParents: true })
        ),
      provider: "modal",
    });
  });

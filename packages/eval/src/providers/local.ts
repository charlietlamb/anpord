import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect, Stream } from "effect";
import type { ProviderName } from "../domain/cell";
import { SandboxUnavailable } from "../domain/errors";
import type {
  ExecChunk,
  OpenSandbox,
  SandboxAdapterShape,
  SandboxHandle,
} from "../ports/sandbox";

const DEFAULT_TIMEOUT_MS = 120_000;

/** Runs a command for real, in a real shell, in a real directory.
 *
 * The exit code arrives in the stream rather than after it, matching the
 * remote providers: a mock that returned it another way would let a bug in
 * how we read exit codes pass here and fail in production. */
const execute = (
  root: string,
  command: string,
  timeoutMs: number
): Stream.Stream<ExecChunk, SandboxUnavailable> =>
  Stream.async<ExecChunk, SandboxUnavailable>((emit) => {
    const child = spawn(command, {
      cwd: root,
      env: { ...process.env, HOME: root },
      shell: "/bin/bash",
    });

    const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);

    child.stdout.on("data", (data: Buffer) => {
      emit.single({ data: data.toString(), stream: "stdout" });
    });

    child.stderr.on("data", (data: Buffer) => {
      emit.single({ data: data.toString(), stream: "stderr" });
    });

    child.on("error", (cause) => {
      clearTimeout(timer);
      emit.fail(
        new SandboxUnavailable({ provider: "local", reason: String(cause) })
      );
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      /* A killed process reports a null code. Reported as a failure rather
         than as zero, because a timeout that read as success would be the
         vacuous pass this product exists to catch. */
      emit.single({ exitCode: code ?? 137, stream: "exit" });
      emit.end();
    });
  });

/**
 * A sandbox on this machine, for tests and for a customer trying the product
 * before handing over cloud credentials.
 *
 * Deliberately a real shell in a real temporary directory rather than a fake
 * that returns canned output. A fixture that cannot fail teaches nothing, and
 * the whole argument of this product is that a run which never executed must
 * not be scored as a pass. This provider is not isolation: it runs as the
 * current user and is unsafe for untrusted code.
 */
export const makeLocalAdapter: Effect.Effect<SandboxAdapterShape> =
  Effect.succeed({
    attach: (id: string) =>
      Effect.fail(
        new SandboxUnavailable({
          provider: "local",
          reason: `a local sandbox does not outlive its process, so ${id} cannot be reattached`,
        })
      ),
    destroy: (handle: SandboxHandle) =>
      Effect.promise(() => rm(handle.id, { force: true, recursive: true })),
    open: (_request: OpenSandbox) =>
      Effect.gen(function* () {
        const root = yield* Effect.tryPromise({
          catch: (cause) =>
            new SandboxUnavailable({
              provider: "local",
              reason: String(cause),
            }),
          try: () => mkdtemp(join(tmpdir(), "anpord-local-")),
        });

        return {
          exec: (command, options) =>
            execute(
              options?.cwd ?? root,
              command,
              options?.timeoutMs ?? DEFAULT_TIMEOUT_MS
            ),
          id: root,
          provider: "local" as ProviderName,
          writeFile: (path, content) =>
            Effect.tryPromise({
              catch: (cause) =>
                new SandboxUnavailable({
                  provider: "local",
                  reason: String(cause),
                }),
              try: async () => {
                const { mkdir, writeFile } = await import("node:fs/promises");
                const target = path.startsWith("/") ? path : join(root, path);

                await mkdir(join(target, ".."), { recursive: true });
                await writeFile(target, content, "utf8");
              },
            }),
        } satisfies SandboxHandle;
      }),
    provider: "local" as ProviderName,
  });

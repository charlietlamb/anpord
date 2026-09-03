import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Config, Effect, type Stream } from "effect";
import { execStream } from "../../src/adapters/sandbox/exec-stream";
import { SandboxUnavailable } from "../../src/domain/errors";
import type {
  ExecChunk,
  OpenSandbox,
  SandboxAdapterShape,
  SandboxHandle,
} from "../../src/ports/sandbox";
import { notResumableFixture } from "../fixtures/not-resumable";

/* A real shell on the machine running the tests, used to prove the sandbox
   streaming contract without holding a cloud credential. It is not a provider
   the product offers: an eval that ran on the server itself would be an open
   shell for anyone with an account.

   It reports under a real provider name because the error type names one, and
   nothing reads it here beyond the assertions below. */
const STANDS_IN_FOR = "daytona" as const;

const DEFAULT_TIMEOUT_MS = 120_000;

const unavailable = (reason: unknown) =>
  new SandboxUnavailable({
    provider: STANDS_IN_FOR,
    reason: reason instanceof Error ? reason.message : String(reason),
  });

const execute = (
  root: string,
  command: string,
  timeoutMs: number,
  path: string,
  options: Readonly<Record<string, string>>
): Stream.Stream<ExecChunk, SandboxUnavailable> =>
  execStream((sink) =>
    Effect.async<number, SandboxUnavailable>((resume) => {
      const child = spawn(command, {
        cwd: root,

        detached: true,

        env: { HOME: root, PATH: path, ...options },
        shell: "/bin/bash",
      });

      const killTree = () => {
        const pid = child.pid;

        try {
          if (pid === undefined) {
            child.kill("SIGKILL");
            return;
          }

          process.kill(-pid, "SIGKILL");
        } catch {
          child.kill("SIGKILL");
        }
      };

      const timer = setTimeout(killTree, timeoutMs);

      child.stdout.on("data", (data: Buffer) => {
        sink.stdout(data.toString());
      });

      child.stderr.on("data", (data: Buffer) => {
        sink.stderr(data.toString());
      });

      child.on("error", (cause) => {
        clearTimeout(timer);
        resume(Effect.fail(unavailable(cause)));
      });

      child.on("close", (code) => {
        clearTimeout(timer);

        resume(Effect.succeed(code ?? 137));
      });

      return Effect.sync(() => {
        clearTimeout(timer);
        killTree();
      });
    })
  );

export const makeLocalAdapter: Effect.Effect<SandboxAdapterShape> = Effect.gen(
  function* () {
    const path = yield* Config.string("PATH").pipe(
      Config.withDefault(""),
      Effect.orDie
    );

    return {
      attach: (id: string) =>
        Effect.fail(
          new SandboxUnavailable({
            provider: STANDS_IN_FOR,
            reason: `a local sandbox does not outlive its process, so ${id} cannot be reattached`,
          })
        ),
      destroy: (handle: Pick<SandboxHandle, "id">) =>
        Effect.tryPromise({
          catch: unavailable,
          try: () => rm(handle.id, { force: true, recursive: true }),
        }).pipe(Effect.asVoid),
      open: (_request: OpenSandbox) =>
        Effect.gen(function* () {
          const root = yield* Effect.tryPromise({
            catch: unavailable,
            try: () => mkdtemp(join(tmpdir(), "anpord-local-")),
          });

          return {
            exec: (command, options) =>
              execute(
                options?.cwd ?? root,
                command,
                options?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
                path,

                options?.env ?? {}
              ),
            id: root,
            home: root,
            provider: STANDS_IN_FOR,
            streaming: true,
            writeFile: (path, content) =>
              Effect.tryPromise({
                catch: unavailable,
                try: async () => {
                  const target = path.startsWith("/") ? path : join(root, path);

                  await mkdir(join(target, ".."), { recursive: true });
                  await writeFile(target, content, "utf8");
                },
              }),
            ...notResumableFixture,
          } satisfies SandboxHandle;
        }),
      provider: STANDS_IN_FOR,
    };
  }
);

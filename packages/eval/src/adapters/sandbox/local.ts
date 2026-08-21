import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect, Stream } from "effect";
import type { ProviderName } from "../../domain/cell";
import { SandboxUnavailable } from "../../domain/errors";
import type {
  ExecChunk,
  OpenSandbox,
  SandboxAdapterShape,
  SandboxHandle,
} from "../../ports/sandbox";

const DEFAULT_TIMEOUT_MS = 120_000;

/** One constructor, matching the remote adapters: an Error rendered by
 * String keeps its class name and loses its message. */
const unavailable = (reason: unknown) =>
  new SandboxUnavailable({
    provider: "local",
    reason: reason instanceof Error ? reason.message : String(reason),
  });

/** Runs a command for real, in a real shell, in a real directory. */
const execute = (
  root: string,
  command: string,
  timeoutMs: number,
  options: Readonly<Record<string, string>>
): Stream.Stream<ExecChunk, SandboxUnavailable> =>
  Stream.async<ExecChunk, SandboxUnavailable>((emit) => {
    const child = spawn(command, {
      cwd: root,
      /* Its own process group, so a kill reaches the whole tree. A shell
         spawned without one leaves its children behind: killing bash left
         the sleep it had started still running. */
      detached: true,
      /* Not the parent environment. It carries the provider keys this
         process was given, and the commands running here were written by a
         model: agent-trial keeps credentials Redacted precisely so they do
         not reach a sandbox, and spreading process.env would undo that. */
      env: { HOME: root, PATH: process.env.PATH ?? "", ...options },
      shell: "/bin/bash",
    });

    /* Negative pid addresses the group rather than the leader. */
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
      emit.single({ data: data.toString(), stream: "stdout" });
    });

    child.stderr.on("data", (data: Buffer) => {
      emit.single({ data: data.toString(), stream: "stderr" });
    });

    child.on("error", (cause) => {
      clearTimeout(timer);
      emit.fail(unavailable(cause));
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      /* A killed process reports a null code. Reported as a failure rather
         than as zero, because a timeout that read as success would be the
         vacuous pass this product exists to catch. */
      emit.single({ exitCode: code ?? 137, stream: "exit" });
      emit.end();
    });

    /* Returned so an interrupted trial takes its process with it. Without
       this the fiber goes away and the command keeps running: measured, two
       orphans survived a single interrupt. */
    return Effect.sync(() => {
      clearTimeout(timer);
      killTree();
    });
  });

/** A sandbox on this machine, for tests and for a customer trying the
 * product before handing over cloud credentials. */
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
              /* Honoured, because the port declares it and both remote
                 providers pass it through: a local run that quietly ignored
                 it would diverge from what it exists to stand in for. */
              options?.env ?? {}
            ),
          id: root,
          provider: "local" as ProviderName,
          writeFile: (path, content) =>
            Effect.tryPromise({
              catch: unavailable,
              try: async () => {
                const target = path.startsWith("/") ? path : join(root, path);

                await mkdir(join(target, ".."), { recursive: true });
                await writeFile(target, content, "utf8");
              },
            }),
        } satisfies SandboxHandle;
      }),
    provider: "local" as ProviderName,
  });

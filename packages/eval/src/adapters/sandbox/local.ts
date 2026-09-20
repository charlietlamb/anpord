import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Config, Effect, Option, type Stream } from "effect";
import { SandboxUnavailable, sandboxUnavailable } from "../../domain/errors";
import type {
  ExecChunk,
  OpenSandbox,
  SandboxAdapterShape,
  SandboxHandle,
} from "../../ports/sandbox";
import { noCache } from "./capabilities";
import { execStream } from "./exec-stream";
import { localCache } from "./local-cache";
import { localDetached } from "./local-detached";
import { localRoots } from "./local-home";

const DEFAULT_TIMEOUT_MS = 120_000;

const unavailable = (reason: string) =>
  new SandboxUnavailable({ provider: "local", reason });

const failed = (reason: unknown) => sandboxUnavailable("local", reason);

const execute = (
  root: string,
  command: string,
  timeoutMs: number,
  base: Readonly<Record<string, string>>,
  options: Readonly<Record<string, string>>
): Stream.Stream<ExecChunk, SandboxUnavailable> =>
  execStream((sink) =>
    Effect.async<number, SandboxUnavailable>((resume) => {
      const child = spawn(command, {
        cwd: root,

        detached: true,

        env: { ...base, ...options },
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

      let timedOut = false;

      const timer = setTimeout(() => {
        timedOut = true;
        killTree();
      }, timeoutMs);

      child.stdout.on("data", (data: Buffer) => {
        sink.stdout(data.toString());
      });

      child.stderr.on("data", (data: Buffer) => {
        sink.stderr(data.toString());
      });

      child.on("error", (cause) => {
        clearTimeout(timer);
        resume(Effect.fail(failed(cause)));
      });

      /* A killed command exits like any other, so without this a timeout
         would be scored as a verdict rather than reported as one. */
      child.on("close", (code) => {
        clearTimeout(timer);

        resume(
          timedOut
            ? Effect.fail(unavailable(`timed out after ${timeoutMs}ms`))
            : Effect.succeed(code ?? 137)
        );
      });

      return Effect.sync(() => {
        clearTimeout(timer);
        killTree();
      });
    })
  );

/* Naming `local` is always allowed so the refusal can say why. Opening one is
   not: a shell on the server is a shell for whoever can reach it, which is
   only ever acceptable when the operator and the machine are the same person. */
const refusing = (reason: string): SandboxAdapterShape => ({
  attach: () => Effect.fail(unavailable(reason)),
  destroy: () => Effect.void,
  open: () => Effect.fail(unavailable(reason)),
  provider: "local",
});

const OFF =
  "the local sandbox runs commands on this machine, so it opens only where ANPORD_LOCAL_SANDBOX is set";

export const makeLocalAdapter: Effect.Effect<SandboxAdapterShape> = Effect.gen(
  function* () {
    const enabled = yield* Config.boolean("ANPORD_LOCAL_SANDBOX").pipe(
      Config.withDefault(false),
      Effect.orDie
    );

    if (!enabled) {
      return refusing(OFF);
    }

    const path = yield* Config.string("PATH").pipe(
      Config.withDefault(""),
      Effect.orDie
    );

    const roots = yield* localRoots;

    return {
      attach: (id: string) =>
        Effect.fail(
          unavailable(
            `a local sandbox does not outlive its process, so ${id} cannot be reattached`
          )
        ),
      destroy: (handle: Pick<SandboxHandle, "id">) =>
        Effect.tryPromise({
          catch: failed,
          try: () => rm(handle.id, { force: true, recursive: true }),
        }).pipe(Effect.asVoid),
      open: (request: OpenSandbox) =>
        Effect.gen(function* () {
          const root = yield* Effect.tryPromise({
            catch: failed,
            try: () => mkdtemp(join(tmpdir(), "anpord-local-")),
          });

          /* Every real adapter makes the workspace as it opens, and a command
             whose cwd does not exist fails before it runs. */
          yield* Effect.tryPromise({
            catch: failed,
            try: () => mkdir(request.workspace, { recursive: true }),
          });

          const base = { HOME: roots.home, PATH: path };

          return {
            cache:
              request.cache === undefined
                ? noCache
                : Option.some(localCache(roots.cache)),
            exec: (command, options) =>
              execute(
                options?.cwd ?? root,
                command,
                options?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
                base,

                options?.env ?? {}
              ),
            home: roots.home,
            id: root,
            provider: "local",
            resumable: Option.some(localDetached(root, path, base)),
            writeFile: (target, content) =>
              Effect.tryPromise({
                catch: failed,
                try: async () => {
                  const file = target.startsWith("/")
                    ? target
                    : join(root, target);

                  await mkdir(join(file, ".."), { recursive: true });
                  await writeFile(file, content, "utf8");
                },
              }),
          } satisfies SandboxHandle;
        }),
      provider: "local",
    };
  }
);

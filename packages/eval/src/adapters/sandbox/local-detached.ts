import { spawn } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { Effect, Random } from "effect";
import { SandboxUnavailable } from "../../domain/errors";
import type { ResumableCommands } from "../../ports/sandbox";

const failed = (reason: unknown) =>
  new SandboxUnavailable({
    provider: "local",
    reason: reason instanceof Error ? reason.message : String(reason),
  });

const read = async (path: string) => {
  try {
    return await readFile(path, "utf8");
  } catch {
    return "";
  }
};

/* A command that outlives the call which started it. Its streams redirect to
   files, so polling reads what has been written so far exactly as a
   provider's log endpoint does. */
export const localDetached = (
  root: string,
  path: string,
  env: Readonly<Record<string, string>>
): ResumableCommands => {
  const runs = join(root, ".anpord-runs");

  return {
    progress: (started) =>
      Effect.tryPromise({
        catch: failed,
        try: async () => {
          const [stdout, stderr, status] = await Promise.all([
            read(join(runs, `${started.id}.out`)),
            read(join(runs, `${started.id}.err`)),
            read(join(runs, `${started.id}.exit`)),
          ]);

          return {
            exitCode: status.trim() === "" ? null : Number(status.trim()),
            stderr,
            stdout,
          };
        },
      }),
    start: (command, options) =>
      Effect.gen(function* () {
        const salt = yield* Random.nextIntBetween(0, 1_000_000);
        const id = `run-${salt}`;

        return yield* Effect.tryPromise({
          catch: failed,
          try: async () => {
            await mkdir(runs, { recursive: true });

            const out = join(runs, `${id}.out`);
            const err = join(runs, `${id}.err`);
            const exit = join(runs, `${id}.exit`);

            const child = spawn(
              `{ ${command} ; } > ${JSON.stringify(out)} 2> ${JSON.stringify(err)}; printf %s $? > ${JSON.stringify(exit)}`,
              {
                cwd: options?.cwd ?? root,
                detached: true,
                env: { ...env, PATH: path, ...options?.env },
                shell: "/bin/bash",
                stdio: "ignore",
              }
            );

            child.unref();

            return { id, session: id };
          },
        });
      }),
  };
};

import { spawn } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { Effect, Random } from "effect";
import type { ResumableCommands } from "../../ports/sandbox";
import { providerCall, unavailableFor } from "./provider-adapter";

const call = providerCall("local");

const KILLED = 137;

const read = (path: string) =>
  Effect.tryPromise(() => readFile(path, "utf8")).pipe(
    Effect.orElseSucceed(() => "")
  );

export const localDetached = (
  root: string,
  path: string,
  env: Readonly<Record<string, string>>
): ResumableCommands => {
  const runs = join(root, ".anpord-runs");
  const fileOf = (id: string, suffix: string) => join(runs, `${id}.${suffix}`);
  const exits = new Map<string, Promise<void>>();
  const closedWith = new Map<string, number>();

  return {
    progress: (started) =>
      Effect.all(
        [
          read(fileOf(started.id, "out")),
          read(fileOf(started.id, "err")),
          read(fileOf(started.id, "exit")),
        ],
        { concurrency: "unbounded" }
      ).pipe(
        Effect.map(([stdout, stderr, status]) => ({
          exitCode:
            status.trim() === ""
              ? (closedWith.get(started.id) ?? null)
              : Number(status.trim()),
          stderr,
          stdout,
        }))
      ),
    settled: (started) => {
      const exit = exits.get(started.id);

      return exit === undefined ? Effect.never : Effect.promise(() => exit);
    },
    start: (command, options) =>
      Effect.gen(function* () {
        const id = `run-${yield* Random.nextIntBetween(0, 1_000_000)}`;
        const [out, err, exit] = ["out", "err", "exit"].map((suffix) =>
          JSON.stringify(fileOf(id, suffix))
        );

        yield* call(() => mkdir(runs, { recursive: true }));
        const child = yield* Effect.try({
          catch: unavailableFor("local"),
          try: () =>
            spawn(
              `{ ${command} ; } > ${out} 2> ${err}; printf %s $? > ${exit}`,
              {
                cwd: options?.cwd ?? root,
                detached: true,
                env: { ...env, PATH: path, ...options?.env },
                shell: "/bin/bash",
                stdio: "ignore",
              }
            ),
        });

        exits.set(
          id,
          new Promise((resolve) =>
            child.once("close", (code) => {
              closedWith.set(id, code ?? KILLED);
              resolve();
            })
          )
        );
        child.unref();

        return { id, session: id };
      }),
  };
};

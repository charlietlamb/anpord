import { spawn } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { Effect, Random } from "effect";
import type { ResumableCommands } from "../../ports/sandbox";
import { providerCall, unavailableFor } from "./provider-adapter";

const call = providerCall("local");

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
          exitCode: status.trim() === "" ? null : Number(status.trim()),
          stderr,
          stdout,
        }))
      ),
    start: (command, options) =>
      Effect.gen(function* () {
        const id = `run-${yield* Random.nextIntBetween(0, 1_000_000)}`;
        const [out, err, exit] = ["out", "err", "exit"].map((suffix) =>
          JSON.stringify(fileOf(id, suffix))
        );

        yield* call(() => mkdir(runs, { recursive: true }));
        yield* Effect.try({
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
            ).unref(),
        });

        return { id, session: id };
      }),
  };
};

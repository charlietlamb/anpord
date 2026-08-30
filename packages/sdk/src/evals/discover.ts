import { stat } from "node:fs/promises";
import { resolve } from "node:path";
import { Effect } from "effect";
import { glob } from "tinyglobby";
import { EVAL_FILE_IGNORES, EVAL_FILE_PATTERN } from "../constants/evals";

export const discoverEvalFiles = (
  targets: readonly string[],
  cwd = process.cwd()
) =>
  Effect.tryPromise({
    try: async () => {
      const roots = targets.length === 0 ? ["."] : targets;
      const discovered = await Promise.all(
        roots.map(async (target) => {
          const path = resolve(cwd, target);
          const info = await stat(path);

          if (info.isFile()) {
            return [path];
          }

          return info.isDirectory()
            ? glob(EVAL_FILE_PATTERN, {
                absolute: true,
                cwd: path,
                followSymbolicLinks: false,
                ignore: EVAL_FILE_IGNORES,
              })
            : [];
        })
      );
      const files = [...new Set(discovered.flat())].toSorted();

      if (files.length === 0) {
        throw new Error(`No ${EVAL_FILE_PATTERN} files found`);
      }

      return files;
    },
    catch: (cause) =>
      cause instanceof Error
        ? cause
        : new Error("Could not discover eval files", { cause }),
  });

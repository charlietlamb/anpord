import { realpathSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { sep } from "node:path";
import { Effect } from "effect";
import { bundle } from "./eval-bundle";

/* Compared by what the filesystem resolves to, not the strings: on macOS /var
   and /private/var name one file two ways. */
const realOrGiven = (path: string) => {
  try {
    return realpathSync.native(path);
  } catch {
    return path;
  }
};

const sameFile = (one: string, other: string) =>
  one === other || realOrGiven(one) === realOrGiven(other);

const exportingModule = (
  entry: string,
  inputs: readonly string[],
  name: string
) =>
  Effect.gen(function* () {
    const pattern = new RegExp(
      `\\bexport\\s+(?:async\\s+)?(?:const|function)\\s+${name}\\b`
    );
    const matches = yield* Effect.filter(
      inputs.filter(
        (path) =>
          !(sameFile(path, entry) || path.includes(`${sep}node_modules${sep}`))
      ),
      (path) =>
        Effect.tryPromise(() => readFile(path, "utf8")).pipe(
          Effect.map((source) => pattern.test(source)),
          Effect.orElseSucceed(() => false)
        ),
      { concurrency: 8 }
    );

    if (matches.length !== 1) {
      return yield* Effect.fail(
        new Error(
          `${name} must be one named function or const export from a separate TypeScript file`
        )
      );
    }

    return matches[0] as string;
  });

export const bundledCaseModule = (
  entry: string,
  inputs: readonly string[],
  name: string,
  wrap: (module: string, exported: string) => string
) =>
  Effect.gen(function* () {
    const module = yield* exportingModule(entry, inputs, name);
    const { source } = yield* bundle(wrap(module, name), entry, {
      minify: true,
    });

    return { name, source };
  });

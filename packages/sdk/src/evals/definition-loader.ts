import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { Effect, Option, Schema } from "effect";
import { bundle } from "./eval-bundle";
import { definitionEntry } from "./runner-source";
import type { EvalDefinition } from "./types";

export const loadDefinition = (entry: string) =>
  bundle(definitionEntry(entry), entry).pipe(
    Effect.flatMap(({ inputs, source }) =>
      Effect.acquireUseRelease(
        Effect.tryPromise(() => mkdtemp(join(tmpdir(), "anpord-eval-"))),
        (directory) =>
          Effect.tryPromise({
            try: async () => {
              const output = join(directory, "definition.mjs");
              await writeFile(output, source);
              const module = await import(pathToFileURL(output).href);
              return { definition: module.default as unknown, inputs };
            },
            catch: (cause) =>
              new Error(
                `Could not load ${entry}: ${cause instanceof Error ? cause.message : String(cause)}`,
                { cause }
              ),
          }),
        (directory) =>
          Effect.promise(() =>
            rm(directory, { force: true, recursive: true })
          ).pipe(Effect.ignore)
      )
    )
  );

/* Decides only whether the module exported a definition: the author's own
   functions inside it are the compiler's to reject, not a schema's. */
const DefinitionShape = Schema.Struct({
  cases: Schema.Array(Schema.Unknown),
  name: Schema.String,
  prompt: Schema.String,
  tasks: Schema.Array(Schema.Unknown),
  trials: Schema.Int,
});

const decodeShape = Schema.decodeUnknownOption(DefinitionShape);

export const isDefinition = (value: unknown): value is EvalDefinition =>
  Option.isSome(decodeShape(value));

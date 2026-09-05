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

/* The structure a `defineEval` result has, and no more: the cases and tasks
   carry the author's own functions, which no schema can describe and which
   are the compiler's to reject by name if they are wrong. This decides only
   whether the module exported a definition at all. */
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

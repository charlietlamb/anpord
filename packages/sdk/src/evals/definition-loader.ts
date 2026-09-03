import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { Effect } from "effect";
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

export const isDefinition = (value: unknown): value is EvalDefinition =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as EvalDefinition).name === "string" &&
  typeof (value as EvalDefinition).prompt === "string" &&
  Array.isArray((value as EvalDefinition).cases) &&
  Array.isArray((value as EvalDefinition).tasks) &&
  Number.isInteger((value as EvalDefinition).trials);

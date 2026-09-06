import { fileURLToPath } from "node:url";
import { Effect } from "effect";
import { sourceUrlOf } from "./define";
import type { DefinitionRef } from "./runner-source";
import type { EvalDefinition } from "./types";

const HINT =
  "Pass import.meta.url as the first argument to defineEval, or compile by path.";

const exportHolding = async (entry: string, definition: EvalDefinition) => {
  const module: Record<string, unknown> = await import(entry);

  if (module.default === definition) {
    return null;
  }

  const named = Object.keys(module).find((key) => module[key] === definition);

  if (named === undefined) {
    throw new Error(
      `The definition passed is not exported from ${entry}. ${HINT}`
    );
  }

  return named;
};

export const locate = (definition: EvalDefinition) =>
  Effect.gen(function* () {
    const url = sourceUrlOf(definition);

    if (url === undefined) {
      return yield* Effect.fail(
        new Error(`This eval does not know where it was written. ${HINT}`)
      );
    }

    const exportName = yield* Effect.tryPromise({
      catch: (cause) =>
        cause instanceof Error ? cause : new Error(String(cause)),
      try: () => exportHolding(url, definition),
    });

    return { entry: fileURLToPath(url), exportName } satisfies DefinitionRef;
  });

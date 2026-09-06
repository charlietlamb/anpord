import type { EvalDefinition } from "./types";

export const SOURCE_URL = Symbol.for("anpord.sourceUrl");

export function defineEval<const Definition extends EvalDefinition>(
  definition: Definition
): Definition;
export function defineEval<const Definition extends EvalDefinition>(
  sourceUrl: string,
  definition: Definition
): Definition;
export function defineEval<const Definition extends EvalDefinition>(
  first: string | Definition,
  second?: Definition
): Definition {
  if (typeof first !== "string") {
    return first;
  }

  return Object.defineProperty(second as Definition, SOURCE_URL, {
    enumerable: false,
    value: first,
  });
}

export const sourceUrlOf = (definition: EvalDefinition): string | undefined =>
  (definition as { [SOURCE_URL]?: string })[SOURCE_URL];

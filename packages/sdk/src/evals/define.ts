import type { EvalDefinition } from "./types";

const SOURCE_URL = Symbol.for("anpord.sourceUrl");

export function suite<const Definition extends EvalDefinition>(
  definition: Definition
): Definition;
export function suite<const Definition extends EvalDefinition>(
  sourceUrl: string,
  definition: Definition
): Definition;
export function suite<const Definition extends EvalDefinition>(
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

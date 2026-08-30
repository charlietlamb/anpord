import type { EvalDefinition } from "./types";

export const defineEval = <const Definition extends EvalDefinition>(
  definition: Definition
): Definition => definition;

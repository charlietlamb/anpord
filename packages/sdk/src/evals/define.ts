import type { EvalDefinition } from "./types";

/** Declares an eval without running it. */
export const defineEval = <const Definition extends EvalDefinition>(
  definition: Definition
): Definition => definition;

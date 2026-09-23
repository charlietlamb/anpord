import type { EvalVariantDefinition } from "anpord";

/* Named rather than left to the default, so this suite keeps testing the same
   sandbox if the default ever moves. */
export const variants = [
  { harness: "codex", model: "gpt-5.6-sol", sandbox: "e2b" },
] satisfies readonly EvalVariantDefinition[];
export const trials = 3;

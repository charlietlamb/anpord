import type { EvalTaskDefinition } from "anpord";

/* Named rather than left to the default, so this suite keeps testing the same
   sandbox if the default ever moves. */
export const tasks = [
  { harness: "codex", model: "gpt-5.6-sol", sandbox: "e2b" },
] satisfies readonly EvalTaskDefinition[];
export const trials = 3;

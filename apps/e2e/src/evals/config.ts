import type { EvalTaskDefinition } from "anpord";

export const tasks = [
  { harness: "codex", model: "gpt-5.6-sol", provider: "e2b" },
] satisfies readonly EvalTaskDefinition[];
export const trials = 3;

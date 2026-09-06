import { defineEval } from "../../../src/evals/define";
import { empty } from "../../../src/evals/source";

const expected = "hello";

export const smoke = defineEval(import.meta.url, {
  name: "smoke",
  source: empty,
  prompt: "Create hello.txt",
  tasks: [{ harness: "codex", model: "gpt-5.6-sol" }],
  trials: 1,
  cases: [
    {
      name: "writes hello",
      validate: async ({ readText }) => ({
        passed: (await readText("hello.txt")) === expected,
      }),
    },
  ],
});

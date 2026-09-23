import { suite } from "../../../src/evals/define";
import { empty } from "../../../src/evals/source";

const expected = "hello";

export const smoke = suite({
  name: "smoke",
  source: empty,
  prompt: "Create hello.txt",
  variants: [{ harness: "codex", model: "gpt-5.6-sol" }],
  trials: 1,
  cases: [
    {
      id: "writes-hello",
      name: "writes hello",
      validate: async ({ readText }) => ({
        passed: (await readText("hello.txt")) === expected,
      }),
    },
  ],
});

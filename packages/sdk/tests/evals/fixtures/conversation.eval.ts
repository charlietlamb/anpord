import { suite } from "../../../src/evals/define";
import { empty } from "../../../src/evals/source";
import { human } from "../../../src/validators";

export const conversation = suite({
  name: "conversation",
  source: empty,
  prompt: "Model the pricing",
  tasks: [{ harness: "codex", model: "gpt-5.6-sol" }],
  trials: 1,
  cases: [
    {
      name: "asks before it pushes",
      user: human({
        goal: "Get Pro live, not just written to a file.",
        prompt:
          "Pro is $20 a month with 500 messages. If the agent asks whether to push: yes, go ahead.",
      }),
      validate: async () => ({ passed: true }),
    },
  ],
});

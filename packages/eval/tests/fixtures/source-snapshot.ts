import { defineEval } from "../../../sdk/src/evals/define";
import { empty } from "../../../sdk/src/evals/source";
import type { Validator } from "../../../sdk/src/evals/types";

const validate: Validator = () => true;

export default defineEval({
  name: "source-snapshot",
  source: empty,
  prompt: "Use the fixture",
  cases: [{ name: "fixture", validate }],
  tasks: [{ harness: "codex", model: "test", provider: "e2b" }],
  trials: 1,
});

import type { EvalRun, EvalTrial } from "@anpord/schema/domain/evals";
import { RUN, TRIALS } from "@/components/dev/eval-fixtures";
import { VALIDATION_TRIALS } from "@/components/dev/validation-fixtures";

const [FIRST] = TRIALS;

export const VALIDATED_TRIAL = {
  ...FIRST,
  ...VALIDATION_TRIALS[0],
} as EvalTrial;

export const VALIDATED_SETUP: EvalRun["setup"] = {
  ...RUN.setup,
  validator: "validate",
  validatorFiles: [
    {
      content:
        "export const validate = async ({ answer }) => ({\n  passed: (await answer()).includes('CI fixture'),\n});\n",
      path: "evals/validate.ts",
    },
  ],
  verify: null,
};

export const VALIDATED_RUN: EvalRun = {
  ...RUN,
  setup: VALIDATED_SETUP,
  trials: [VALIDATED_TRIAL],
};

export const LOCAL_TRIAL = {
  ...FIRST,
  commands: 0,
  costs: null,
  exitCode: -1,
  failedCommands: 3,
  filesChanged: [],
  modelMs: 0,
  sandboxMs: 0,
  status: "void",
  timed: false,
  usage: null,
  voidFields: ["sandbox"],
} as EvalTrial;

export const LOCAL_RUN: EvalRun = {
  ...RUN,
  local: true,
  trials: [LOCAL_TRIAL],
  variant: { ...RUN.variant, sandbox: "local" },
};

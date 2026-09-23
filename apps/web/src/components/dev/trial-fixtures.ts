import type { EvalRun, EvalTrial } from "@anpord/schema/domain/evals";
import { CELL, RUN, TRIALS } from "@/components/dev/eval-fixtures";
import { VALIDATION_TRIALS } from "@/components/dev/validation-fixtures";

const [FIRST] = TRIALS;

const VALIDATOR_FILES = [
  {
    path: "evals/validate.ts",
    content:
      "export const validate = async ({ answer }) => ({\n  passed: (await answer()).includes('CI fixture'),\n});\n",
  },
];

export const VALIDATED_TRIAL = {
  ...FIRST,
  ...VALIDATION_TRIALS[0],
} as EvalTrial;

export const VALIDATED_SETUP = CELL.setup && {
  ...CELL.setup,
  validatorFiles: VALIDATOR_FILES,
  validatorName: "validate",
  verifyCommand: null,
};

export const VALIDATED_RUN: EvalRun = {
  ...RUN,
  cells: [{ ...CELL, setup: VALIDATED_SETUP, trials: [VALIDATED_TRIAL] }],
};

export const LOCAL_TRIAL = {
  ...FIRST,
  commands: 0,
  costs: null,
  exitCode: -1,
  failedCommands: 3,
  filesChanged: [],
  modelMs: 0,
  passed: false,
  sandboxMs: 0,
  status: "void",
  timed: false,
  usage: null,
  voidFields: ["sandbox"],
} as EvalTrial;

export const LOCAL_RUN: EvalRun = {
  ...RUN,
  cells: [{ ...CELL, trials: [LOCAL_TRIAL] }],
  executedBy: "client",
};

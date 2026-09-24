import type { EvalCaseSetup, EvalSetup } from "@anpord/schema/domain/evals";

export const caseSetupOf = (setup: EvalSetup): EvalCaseSetup => ({
  checks: setup.validatorName === null ? [] : [setup.validatorName],
  prepare: setup.prepareName,
  prompt: setup.prompt,
  verify: setup.verifyCommand,
  workspace:
    setup.repoUrl === null
      ? { kind: "empty" }
      : { kind: "repo", ref: setup.repoRef, url: setup.repoUrl },
});

import { validationsOf } from "@anpord/schema/domain/eval-validation-results";
import type { EvalTrial } from "@anpord/schema/domain/evals";

export const trialVerdict = (trial: EvalTrial) => {
  if (trial.status === "running" || trial.status === "queued") {
    return "Running";
  }

  if (trial.status === "void") {
    return trial.voidFields.length === 0
      ? "Not scored"
      : `Not scored · ${trial.voidFields.join(", ")}`;
  }

  const failed = validationsOf(trial).filter(
    (check) => check.status === "failed" || check.status === "error"
  );
  const [first] = failed;

  if (first !== undefined) {
    return failed.length === 1
      ? `${first.name} failed`
      : `${first.name} and ${failed.length - 1} more failed`;
  }

  return trial.status === "passed" ? "All checks passed" : "Failed";
};

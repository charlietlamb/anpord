import { type EvalValidation, validationExecution } from "./eval-validations";
import type { EvalTrial } from "./evals";

type Checked = Pick<EvalTrial, "validations" | "judgments">;

export const validationsOf = (trial: Checked): readonly EvalValidation[] => {
  const validations = [...(trial.validations ?? [])];
  for (const [index, judgment] of (trial.judgments ?? []).entries()) {
    if (
      validations.some(
        (entry) => entry.kind === "judge" && entry.name === judgment.name
      )
    ) {
      continue;
    }
    const verdict =
      judgment.score !== null && judgment.score >= judgment.threshold
        ? "passed"
        : "failed";
    validations.push({
      ...validationExecution(
        {
          id: `legacy-judge:${index}`,
          index,
          name: judgment.name,
          kind: "judge",
        },
        null
      ),
      status: judgment.error === null ? verdict : "error",
      judgment,
      durationMs: judgment.durationMs,
      message: judgment.error ?? judgment.reason,
    });
  }
  return validations;
};

export const validationSummary = (validation: EvalValidation) => {
  if (validation.judgment) {
    return validation.judgment.error ?? validation.judgment.reason;
  }
  if (validation.message) {
    return validation.message;
  }
  if (validation.output.state === "captured") {
    return `Returned ${validation.output.text.slice(0, 160)}${validation.output.truncated || validation.output.text.length > 160 ? "…" : ""}`;
  }
  return validation.status === "running" || validation.status === "queued"
    ? "Waiting for a result"
    : "Return value not recorded";
};

import type { EvalValidation } from "./eval-validations";

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

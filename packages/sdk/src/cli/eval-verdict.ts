import type { EvalValidation } from "@anpord/schema/domain/eval-validations";
import type { EvalTrial } from "@anpord/schema/domain/evals";

const MARKS: Record<EvalValidation["status"], string> = {
  error: "!",
  failed: "✗",
  passed: "✓",
  queued: "·",
  running: "·",
  skipped: "–",
};

const WIDTH = 72;

const clip = (text: string) => {
  const flat = text.replace(/\s+/g, " ").trim();

  return flat.length > WIDTH ? `${flat.slice(0, WIDTH - 1)}…` : flat;
};

/* A validator that neither passed nor failed is a broken check rather than a
   verdict, and saying so beats reporting it as a case the agent failed. */
const decided = (validation: EvalValidation) =>
  validation.status === "passed" || validation.status === "failed";

export const verdictLines = (trial: EvalTrial): readonly string[] => {
  const validations = trial.validations ?? [];

  if (validations.length === 0) {
    return [];
  }

  return validations.map((validation) => {
    const mark = MARKS[validation.status];
    const detail =
      validation.message === "" ? "" : `  ${clip(validation.message)}`;

    return `    ${mark} ${validation.name}${detail}`;
  });
};

export const undecidedIn = (trial: EvalTrial) =>
  (trial.validations ?? []).filter((validation) => !decided(validation));

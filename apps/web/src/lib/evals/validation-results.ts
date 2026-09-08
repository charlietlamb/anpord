import {
  type EvalValidation,
  type ValidationValue,
  validationExecution,
} from "@anpord/schema/domain/eval-validations";
import type { EvalTrial } from "@anpord/schema/domain/evals";

export type ValidationTrial = Pick<
  EvalTrial,
  "ordinal" | "validations" | "judgments"
>;

export const validationsOf = (
  trial: ValidationTrial
): readonly EvalValidation[] => {
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

export const validationKey = (validation: EvalValidation) =>
  `${validation.kind}:${validation.index}:${validation.name}`;

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

const object = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

export const judgeInput = (
  input: ValidationValue
): readonly { label: string; value: string }[] | null => {
  if (input.state !== "captured" || input.truncated) {
    return null;
  }
  try {
    const request = object(JSON.parse(input.text));
    if (!request) {
      return null;
    }
    const prompt = typeof request.prompt === "string" ? request.prompt : "";
    const marker = "\n\nEvidence:\n";
    const separator = prompt.lastIndexOf(marker);
    let raw = request.input;
    let instructions = request.instructions;
    if (separator >= 0) {
      raw = prompt.slice(separator + marker.length);
      instructions = prompt.slice(0, separator);
    }
    const evidence = typeof raw === "string" ? object(JSON.parse(raw)) : null;
    if (
      !evidence ||
      typeof evidence.output !== "string" ||
      typeof instructions !== "string"
    ) {
      return null;
    }
    return [
      { label: "Agent answer", value: evidence.output },
      { label: "Judge instructions", value: instructions },
      ...(typeof evidence.input === "string"
        ? [{ label: "Agent prompt", value: evidence.input }]
        : []),
      ...(typeof evidence.expected === "string"
        ? [{ label: "Expected", value: evidence.expected }]
        : []),
    ];
  } catch {
    return null;
  }
};

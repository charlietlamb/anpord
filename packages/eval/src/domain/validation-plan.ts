import {
  type EvalValidation,
  validationExecution,
} from "@anpord/schema/domain/eval-validations";
import type { EvalValidator } from "@anpord/schema/domain/evals";

export const interruptedValidation = (
  record: EvalValidation,
  finishedAt: number
): EvalValidation => {
  if (record.status === "queued") {
    return {
      ...record,
      status: "skipped",
      message: "Trial ended before validation started",
    };
  }
  if (record.status !== "running") {
    return record;
  }
  return {
    ...record,
    status: "error",
    message: "Validation was interrupted",
    durationMs:
      record.startedAt === null
        ? null
        : Math.max(0, finishedAt - record.startedAt),
  };
};

export const validationPlan = (
  validator: EvalValidator | null | undefined,
  verify: string | null
) => {
  const checks =
    validator != null && "checks" in validator ? [...validator.checks] : [];
  if (validator != null && "source" in validator) {
    checks.push(validator);
  }
  const judges =
    validator != null && !("source" in validator) ? validator.judges : [];
  return [
    ...checks.flatMap((check, group) =>
      (check.manifest ?? [{ index: 0, name: check.name }]).map((item) => ({
        ...item,
        id: `${checks.length > 1 ? `group:${group}:` : ""}code:${item.index}`,
        kind: "code" as const,
      }))
    ),
    ...judges.map((judge, index) => ({
      index,
      name: judge.name,
      id: `judge:${index}`,
      kind: "judge" as const,
    })),
    ...(verify === null || validator != null
      ? []
      : [
          {
            index: 0,
            name: "Verify command",
            id: "command:0",
            kind: "command" as const,
          },
        ]),
  ].map((identity) => ({
    ...validationExecution(identity, null),
    status: "queued" as const,
  }));
};

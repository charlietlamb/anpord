import type {
  EvalValidation,
  ValidationValue,
  validationCapture,
} from "@anpord/schema/domain/eval-validations";
import { validationSnapshot } from "@anpord/schema/domain/eval-validations";
import { resultStatus, validatorResultOf } from "./validator-protocol";

export const completeValidations = (
  records: readonly EvalValidation[],
  message: string | null,
  finished: number,
  error: ValidationValue | null,
  exitCode: number | null
) => {
  const incomplete = records.findIndex(
    (record) => record.status === "running" || record.status === "queued"
  );
  const errorIndex =
    incomplete >= 0
      ? incomplete
      : records.findLastIndex((record) => record.status !== "skipped");
  const hasError = records.some((record) => record.status === "error");
  return records
    .map((record, index): EvalValidation => {
      if (
        index === errorIndex &&
        (incomplete >= 0 || (message !== null && !hasError))
      ) {
        return {
          ...record,
          status: "error",
          exitCode,
          message: message ?? "Validator did not return a complete result",
          error: record.error ?? error,
          durationMs:
            record.startedAt === null
              ? null
              : Math.max(0, finished - record.startedAt),
        };
      }
      if (record.status === "queued" || record.status === "running") {
        return {
          ...record,
          status: "skipped",
          message: "An earlier validator did not complete",
        };
      }
      return record;
    })
    .map(validationSnapshot);
};

export const legacyValidation = (
  record: EvalValidation,
  execution: {
    stdout: string;
    stderr: string;
    exitCode: number | null;
    rawTruncated: boolean;
  },
  finished: number,
  capture: ReturnType<typeof validationCapture>
): EvalValidation => {
  const raw = validatorResultOf(execution.stdout);
  return {
    ...record,
    status: raw === null ? "error" : resultStatus(raw.passed),
    message: (
      raw?.message ?? (raw === null ? "Validator returned no valid result" : "")
    ).slice(0, 2000),
    output: raw === null ? record.output : capture(raw),
    durationMs: Math.max(0, finished - (record.startedAt ?? finished)),
    exitCode: execution.exitCode,
    logs: [
      {
        index: 0,
        at: finished,
        level: "stdout",
        value: capture(execution.stdout, "text"),
      },
      {
        index: 1,
        at: finished,
        level: "stderr",
        value: capture(execution.stderr, "text"),
      },
    ],
    truncated: execution.rawTruncated,
  };
};

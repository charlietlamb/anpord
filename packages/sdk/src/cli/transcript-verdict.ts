import { commandText } from "@sphynx/schema/domain/eval-journal";
import { validationSummary } from "@sphynx/schema/domain/eval-validation-results";
import type { EvalValidation } from "@sphynx/schema/domain/eval-validations";
import { formatDuration } from "./duration";
import { outcomeMark } from "./outcome-mark";
import type { Writer } from "./transcript-writer";

export interface Verdict {
  readonly failure?: string | null;
  readonly status: string;
  readonly validations?: readonly EvalValidation[];
  readonly verifySteps: readonly {
    readonly command: string;
    readonly exitCode: number;
  }[];
  readonly voidFields: readonly string[];
}

interface Check {
  readonly durationMs: number | null;
  readonly name: string;
  readonly status: EvalValidation["status"];
  readonly summary: string | null;
}

const SUMMARY_LINES = 3;

const checksOf = (verdict: Verdict): readonly Check[] => {
  const validations = verdict.validations ?? [];

  return validations.length > 0
    ? validations.map((validation) => ({
        durationMs: validation.durationMs,
        name: validation.name,
        status: validation.status,
        summary: validationSummary(validation),
      }))
    : verdict.verifySteps.map((step) => ({
        durationMs: null,
        name: commandText(step.command),
        status: step.exitCode === 0 ? "passed" : "failed",
        summary: null,
      }));
};

const failing = (check: Check) =>
  check.status === "failed" || check.status === "error";

const checkLines = (check: Check, write: Writer) => {
  const timing =
    check.durationMs === null
      ? ""
      : write.paint.dim(` · ${formatDuration(check.durationMs)}`);
  const mark = write.paint.red(check.status === "error" ? "!" : "✗");
  const summary =
    check.summary === null || check.summary === check.name
      ? []
      : write.indented(check.summary, 2).slice(0, SUMMARY_LINES);

  return [write.nested(`${mark} ${check.name}${timing}`), ...summary];
};

const outcomeOf = (verdict: Verdict, paint: Writer["paint"]) => {
  const mark = outcomeMark(verdict.status, paint);

  if (verdict.status !== "void" && verdict.status !== "timed out") {
    return mark;
  }

  const why =
    verdict.failure ??
    (verdict.voidFields.length === 0
      ? "not scored"
      : verdict.voidFields.join(", "));

  return `${mark}${paint.dim(` · ${why}`)}`;
};

export const verdictLines = (verdict: Verdict, write: Writer) => {
  const checks = checksOf(verdict);
  const passed = checks.filter((check) => check.status === "passed").length;
  const tally =
    checks.length === 0
      ? ""
      : write.paint.dim(` · ${passed} of ${checks.length} checks passed`);

  return [
    write.line(`${outcomeOf(verdict, write.paint)}${tally}`),
    ...checks.filter(failing).flatMap((check) => checkLines(check, write)),
  ];
};

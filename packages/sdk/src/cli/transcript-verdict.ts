import { commandText } from "@anpord/schema/domain/eval-journal";
import type { EvalJudgment } from "@anpord/schema/domain/eval-judges";
import {
  validationSummary,
  validationsOf,
} from "@anpord/schema/domain/eval-validation-results";
import type { EvalValidation } from "@anpord/schema/domain/eval-validations";
import { formatDuration } from "./duration";
import type { Paint } from "./paint";
import type { Writer } from "./transcript-writer";

export interface Verdict {
  readonly judgments?: readonly EvalJudgment[];
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
  const validations = validationsOf(verdict);

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

const markOf = (status: Check["status"], paint: Writer["paint"]) => {
  if (status === "passed") {
    return paint.green("✓");
  }

  if (status === "failed" || status === "error") {
    return paint.red(status === "error" ? "!" : "✗");
  }

  return paint.dim(status === "skipped" ? "–" : "·");
};

const checkLines = (check: Check, write: Writer) => {
  const timing =
    check.durationMs === null
      ? ""
      : write.paint.dim(` · ${formatDuration(check.durationMs)}`);
  const tone: Paint =
    check.status === "passed" ? write.paint.dim : (row) => row;
  const summary =
    check.summary === null || check.summary === check.name
      ? []
      : write.indented(check.summary, 3, tone).slice(0, SUMMARY_LINES);

  return [
    write.line(`  ${markOf(check.status, write.paint)} ${check.name}${timing}`),
    ...summary,
  ];
};

const outcomeOf = (verdict: Verdict, paint: Writer["paint"]) => {
  if (verdict.status === "passed") {
    return paint.green("✓ passed");
  }

  if (verdict.status === "failed") {
    return paint.red("✗ failed");
  }

  return verdict.status === "void"
    ? paint.yellow(
        `○ void · ${verdict.voidFields.length === 0 ? "not scored" : verdict.voidFields.join(", ")}`
      )
    : paint.dim(verdict.status);
};

export const verdictLines = (verdict: Verdict, write: Writer) => {
  const checks = checksOf(verdict);
  const passed = checks.filter((check) => check.status === "passed").length;
  const tally =
    checks.length === 0
      ? ""
      : write.paint.dim(` · ${passed} of ${checks.length} checks passed`);

  return [
    ...(checks.length === 0
      ? []
      : [
          ...write.heading("checks", write.paint.blue),
          ...checks.flatMap((check) => checkLines(check, write)),
        ]),
    write.blank,
    write.close(`${outcomeOf(verdict, write.paint)}${tally}`),
  ];
};

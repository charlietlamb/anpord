import type {
  EvalCell,
  EvalComparison,
  EvalRun,
} from "@anpord/schema/domain/evals";
import { Data, Effect } from "effect";

const regressions = (run: EvalRun) =>
  run.cells.filter((cell) => cell.comparison?.verdict === "regressed");

const unscored = (run: EvalRun) =>
  run.cells.filter((cell) => (cell.distribution?.scored ?? 0) === 0);

const rate = (value: number) => `${Math.round(value * 100) / 100}`;

/* Named only when it moved: the version is the one thing about a variant that
   can differ between a baseline and its candidate, so when it did, it is the
   first thing a reader wants to know. */
const versionClause = (run: EvalRun, cell: EvalCell, found: EvalComparison) =>
  found.baselineHarnessVersion === found.candidateHarnessVersion
    ? ""
    : `${run.tasks[cell.taskIndex]?.harness ?? "harness"} ${found.baselineHarnessVersion} → ${found.candidateHarnessVersion}, `;

const regressionSentence = (run: EvalRun, cell: EvalCell) => {
  const found = cell.comparison;

  if (found === null) {
    return `${cell.caseName} regressed against its baseline.`;
  }

  return `${cell.caseName} regressed against its baseline: ${versionClause(run, cell, found)}pass rate ${rate(found.baselinePassRate)} → ${rate(found.candidatePassRate)}.`;
};

export const problemsWith = (
  run: EvalRun,
  failOn: "never" | "regressed" | "unscored"
): readonly string[] => {
  if (run.status === "failed") {
    return [run.failure ?? "The run failed."];
  }

  if (failOn === "never") {
    return [];
  }

  const found = regressions(run).map((cell) => regressionSentence(run, cell));

  return failOn === "unscored"
    ? [
        ...found,
        ...unscored(run).map(
          (cell) => `${cell.caseName} produced no scored trials.`
        ),
      ]
    : found;
};

export const failWhen = (problems: readonly string[]) =>
  problems.length === 0
    ? Effect.void
    : Effect.fail(new EvalGateFailed({ problems }));

class EvalGateFailed extends Data.TaggedError("EvalGateFailed")<{
  readonly problems: readonly string[];
}> {
  override get message() {
    return this.problems.join("\n");
  }
}

export class NoEvalFiles extends Data.TaggedError("NoEvalFiles")<
  Readonly<Record<never, never>>
> {
  override get message() {
    return "No *.eval.ts file here. Name one, or pass a file to run.";
  }
}

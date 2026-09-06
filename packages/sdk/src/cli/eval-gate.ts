import type {
  EvalCell,
  EvalComparison,
  EvalRun,
} from "@anpord/schema/domain/evals";
import { Data, Effect, Schema } from "effect";

export const EvalGate = Schema.Literal(
  "strict",
  "never",
  "regressed",
  "unscored"
);
export type EvalGate = typeof EvalGate.Type;

const regressions = (run: EvalRun) =>
  run.cells.filter((cell) => cell.comparison?.verdict === "regressed");

const unscored = (run: EvalRun) =>
  run.cells.filter((cell) => (cell.distribution?.scored ?? 0) === 0);

const rate = (value: number) => `${Math.round(value * 100) / 100}`;

/* Named only when it moved -- a harness or profile version differing between
   baseline and candidate is the first thing a reader wants to know. */
const versionClause = (run: EvalRun, cell: EvalCell, found: EvalComparison) =>
  found.baselineHarnessVersion === found.candidateHarnessVersion
    ? ""
    : `${run.tasks[cell.taskIndex]?.harness ?? "harness"} ${found.baselineHarnessVersion} → ${found.candidateHarnessVersion}, `;

const profileClause = (run: EvalRun, cell: EvalCell, found: EvalComparison) => {
  const { baselineProfileVersion, candidateProfileVersion } = found;

  if (
    baselineProfileVersion === null ||
    candidateProfileVersion === null ||
    baselineProfileVersion === candidateProfileVersion
  ) {
    return "";
  }

  const name = run.tasks[cell.taskIndex]?.profile?.name ?? "profile";

  return `${name} ${baselineProfileVersion} → ${candidateProfileVersion}, `;
};

const regressionSentence = (run: EvalRun, cell: EvalCell) => {
  const found = cell.comparison;

  if (found === null) {
    return `${cell.caseName} regressed against its baseline.`;
  }

  return `${cell.caseName} regressed against its baseline: ${versionClause(run, cell, found)}${profileClause(run, cell, found)}pass rate ${rate(found.baselinePassRate)} → ${rate(found.candidatePassRate)}.`;
};

export const problemsWith = (
  run: EvalRun,
  failOn: EvalGate,
  expected?: { readonly cells: number; readonly trials: number }
): readonly string[] => {
  if (run.status === "failed") {
    return [run.failure ?? "The run failed."];
  }

  if (run.status !== "finished") {
    return ["The run has not finished."];
  }

  if (run.cells.length === 0) {
    return ["The run recorded no cells."];
  }

  if (failOn === "strict") {
    if (expected && run.cells.length !== expected.cells) {
      return [
        `Expected ${expected.cells} cells, received ${run.cells.length}.`,
      ];
    }
    return run.cells.flatMap((cell) => {
      if (cell.status !== "finished" || cell.trials.length === 0) {
        return [`${cell.caseName} has no complete trial results.`];
      }
      if (expected && cell.trials.length !== expected.trials) {
        return [
          `${cell.caseName}: expected ${expected.trials} trials, received ${cell.trials.length}.`,
        ];
      }
      return cell.trials.flatMap((trial) =>
        trial.status === "passed" && trial.passed
          ? []
          : [`${cell.caseName}, trial ${trial.ordinal}: ${trial.status}.`]
      );
    });
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

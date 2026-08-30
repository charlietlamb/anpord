import type { EvalRun } from "@anpord/schema/domain/evals";
import { Data, Effect } from "effect";

const regressions = (run: EvalRun) =>
  run.cells.filter((cell) => cell.comparison?.verdict === "regressed");

const unscored = (run: EvalRun) =>
  run.cells.filter((cell) => (cell.distribution?.scored ?? 0) === 0);

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

  const found = regressions(run).map(
    (cell) => `${cell.caseName} regressed against its baseline.`
  );

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

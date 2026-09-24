import type {
  EvalBatch,
  EvalRun,
  EvalTrial,
} from "@anpord/schema/domain/evals";
import { Data, Effect, Schema } from "effect";
import { undecidedIn, verdictLines } from "./eval-verdict";
import { formatVariant } from "./variant-label";

export const EvalGate = Schema.Literal("failures", "strict", "never");
export type EvalGate = typeof EvalGate.Type;

interface Expected {
  readonly runs: number;
  readonly trials: number;
}

const runLabel = (run: EvalRun) =>
  `${run.case.name} on ${formatVariant(run.variant)}`;

const trialProblems = (run: EvalRun, trial: EvalTrial) => {
  if (trial.status === "passed") {
    return [];
  }

  const undecided = undecidedIn(trial);
  const why =
    undecided.length === 0
      ? ""
      : ` (${undecided.length} validator${undecided.length === 1 ? "" : "s"} never decided)`;

  return [
    `${runLabel(run)}, trial ${trial.ordinal}: ${trial.status}.${why}`,
    ...verdictLines(trial),
  ];
};

const incomplete = (run: EvalRun, expected: Expected) => {
  if (run.status !== "finished" || run.trials.length === 0) {
    return [`${runLabel(run)} has no complete trial results.`];
  }

  return run.trials.length === expected.trials
    ? []
    : [
        `${runLabel(run)}: expected ${expected.trials} trials, received ${run.trials.length}.`,
      ];
};

const strictProblems = (batch: EvalBatch, expected: Expected) =>
  batch.runs.length === expected.runs
    ? batch.runs.flatMap((run) => {
        const missing = incomplete(run, expected);

        return missing.length > 0
          ? missing
          : run.trials.flatMap((trial) => trialProblems(run, trial));
      })
    : [`Expected ${expected.runs} runs, received ${batch.runs.length}.`];

export const batchError = (batch: EvalBatch): string | null => {
  if (batch.status === "failed") {
    return batch.failure ?? "The batch failed.";
  }

  if (batch.status !== "finished") {
    return "The batch has not finished.";
  }

  return batch.runs.length === 0 ? "The batch recorded no runs." : null;
};

export const problemsWith = (
  batch: EvalBatch,
  failOn: EvalGate,
  expected: Expected
): readonly string[] => {
  if (failOn === "never") {
    return [];
  }

  return failOn === "strict"
    ? strictProblems(batch, expected)
    : batch.runs.flatMap((run) =>
        run.status === "failed"
          ? [`${runLabel(run)} failed.`]
          : run.trials.flatMap((trial) => trialProblems(run, trial))
      );
};

export class EvalGateFailed extends Data.TaggedError("EvalGateFailed")<{
  readonly problems: readonly string[];
}> {
  override get message() {
    return this.problems.join("\n");
  }
}

export class EvalRunFailed extends Data.TaggedError("EvalRunFailed")<{
  readonly problems: readonly string[];
}> {
  override get message() {
    return this.problems.join("\n");
  }
}

export const failWhen = (
  errors: readonly string[],
  problems: readonly string[]
) => {
  if (errors.length > 0) {
    return Effect.fail(
      new EvalRunFailed({ problems: [...errors, ...problems] })
    );
  }

  return problems.length === 0
    ? Effect.void
    : Effect.fail(new EvalGateFailed({ problems }));
};

export class NoEvalFiles extends Data.TaggedError("NoEvalFiles")<
  Readonly<Record<never, never>>
> {
  override get message() {
    return "No *.eval.ts file here. Name one, or pass a file to run.";
  }
}

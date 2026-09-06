import type { EvalTrial } from "@anpord/schema/domain/evals";

export interface Reading {
  readonly internalId: string;
  readonly runId: string;
  readonly trials: readonly EvalTrial[];
}

export interface TrialRow {
  readonly key: string;
  /* Null except on a reading's first row, so the column is not a run of repeats. */
  readonly runId: string | null;
  readonly runIdFull: string;
  readonly trial: EvalTrial;
}

export const trialRowsOf = (
  readings: readonly Reading[]
): readonly TrialRow[] =>
  readings.flatMap((reading) =>
    reading.trials.map((trial, index) => ({
      key: `${reading.internalId}:${trial.ordinal}`,
      runId: index === 0 ? reading.runId : null,
      runIdFull: reading.runId,
      trial,
    }))
  );

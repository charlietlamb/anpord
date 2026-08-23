import type { EvalTrial } from "@anpord/schema/domain/evals";

/** What a table needs of a reading, which is less than a reading carries: the
 * distribution belongs to the rail that summarises it, not to the rows. */
export interface Reading {
  readonly internalId: string;
  readonly runId: string;
  readonly trials: readonly EvalTrial[];
}

export interface TrialRow {
  readonly key: string;
  /** Null on the first row of a reading, which is the only row that names its
   * run: repeating the id down every trial of a three-trial reading turns a
   * column of distinct values into a column of repeats. */
  readonly runId: string | null;
  readonly runIdFull: string;
  readonly trial: EvalTrial;
}

/**
 * Every trial of every reading, newest reading first.
 *
 * One table rather than one page per reading. A cell reads the same way on
 * every repeat -- the cell key hashes its case, setup and variant -- so the
 * readings differ only in their trials, and nine near-identical pages asked a
 * reader to hold nine sets of numbers in their head to compare them.
 */
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

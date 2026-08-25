import type { evalTrial } from "@anpord/db/schema/evals/eval-trials";
import { type Distribution, distributionOf } from "../domain/distribution";
import type { TrialOutcome, TrialStatus } from "../domain/trial";

type TrialRow = typeof evalTrial.$inferSelect;

/** Rebuilds the outcome a distribution is calculated from. The columns are
 * nullable because a trial is inserted before it runs, and a row that never
 * settled has no verdict to contribute. */
const outcomeOf = (row: TrialRow): TrialOutcome => ({
  commandCount: row.commandCount ?? 0,
  exitCode: row.exitCode ?? -1,
  modelMs: row.modelMs ?? 0,
  passed: row.passed ?? false,
  sandboxMs: row.sandboxMs ?? 0,
  status: row.status as TrialStatus,
  verifySteps: row.verifySteps ?? [],
  voidFields: row.voidFields ?? [],
});

const SETTLED: readonly TrialStatus[] = [
  "passed",
  "failed",
  "void",
  "exceeded",
];

export const distributionFor = (trials: readonly TrialRow[]): Distribution =>
  distributionOf(
    trials
      .filter((trial) => SETTLED.includes(trial.status as TrialStatus))
      .map(outcomeOf)
  );

export const groupByCell = (trials: readonly TrialRow[]) => {
  const byCell = new Map<string, TrialRow[]>();

  for (const trial of trials) {
    const existing = byCell.get(trial.cellInternalId) ?? [];
    existing.push(trial);
    byCell.set(trial.cellInternalId, existing);
  }

  return byCell;
};

import type { evalTrial } from "@anpord/db/schema/evals/eval-trials";
import { type Distribution, distributionOf } from "../domain/distribution";
import type { TrialOutcome, TrialStatus } from "../domain/trial";

type TrialRow = typeof evalTrial.$inferSelect;

type SettledStatus = Extract<TrialStatus, "failed" | "passed" | "void">;

type SettledRow = TrialRow & { readonly status: SettledStatus };

/* The column is free text with no check constraint, so a status this list does
   not name is a row the code does not understand. Such a row is dropped rather
   than scored: counting one as a failure lets a status nobody meant to add
   pull a pass rate down and report a regression that never happened. */
const SETTLED: readonly SettledStatus[] = ["passed", "failed", "void"];

const hasSettled = (row: TrialRow): row is SettledRow =>
  SETTLED.some((status) => status === row.status);

/** Rebuilds the outcome a distribution is calculated from. The columns are
 * nullable because a trial is inserted before it runs, and a row that never
 * settled has no verdict to contribute. */
const outcomeOf = (row: SettledRow): TrialOutcome => ({
  commandCount: row.commandCount ?? 0,
  exitCode: row.exitCode ?? -1,
  modelMs: row.modelMs ?? 0,
  passed: row.passed ?? false,
  sandboxMs: row.sandboxMs ?? 0,
  status: row.status,
  verifySteps: row.verifySteps ?? [],
  voidFields: row.voidFields ?? [],
});

export const distributionFor = (trials: readonly TrialRow[]): Distribution =>
  distributionOf(trials.filter(hasSettled).map(outcomeOf));

export const groupByCell = (trials: readonly TrialRow[]) => {
  const byCell = new Map<string, TrialRow[]>();

  for (const trial of trials) {
    const existing = byCell.get(trial.cellInternalId) ?? [];
    existing.push(trial);
    byCell.set(trial.cellInternalId, existing);
  }

  return byCell;
};

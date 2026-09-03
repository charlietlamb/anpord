import type { evalCell } from "@anpord/db/schema/evals/eval-cells";
import type { evalHarnessProfile } from "@anpord/db/schema/evals/eval-harness-profiles";
import type { evalRun } from "@anpord/db/schema/evals/eval-runs";
import type { evalTrialCost } from "@anpord/db/schema/evals/eval-trial-costs";
import type { evalTrial } from "@anpord/db/schema/evals/eval-trials";
import type { Distribution } from "../domain/distribution";
import { distributionFor } from "./trial-distribution";

type CellRow = typeof evalCell.$inferSelect;
type RunRow = typeof evalRun.$inferSelect;
type TrialRow = typeof evalTrial.$inferSelect;
type CostRow = typeof evalTrialCost.$inferSelect;
type ProfileRow = typeof evalHarnessProfile.$inferSelect;

/** A trial as a reader sees it: the row, and what each layer of it cost. */
interface TrialWithCosts extends TrialRow {
  readonly costs: readonly CostRow[];
}

interface CellTaskRow {
  readonly caseName: string;
  readonly cell: CellRow;
  readonly prepareName: string | null;
  readonly profile: ProfileRow | null;
  readonly prompt: string;
  readonly repoRef: string | null;
  readonly repoUrl: string | null;
  readonly validatorName: string | null;
  readonly verifyCommand: string | null;
  readonly workspace: string;
}

interface CellWithTrials {
  readonly caseName: string;
  readonly cell: CellRow;
  readonly distribution: Distribution;
  readonly prepareName: string | null;
  readonly profile: ProfileRow | null;

  readonly prompt: string;
  readonly repoRef: string | null;
  readonly repoUrl: string | null;
  readonly trials: readonly TrialWithCosts[];

  readonly validatorName: string | null;
  readonly verifyCommand: string | null;
  readonly workspace: string;
}

export interface RunDetail {
  readonly cells: readonly CellWithTrials[];
  readonly run: RunRow;
}

/* Kept as stored rather than summed here: a caller that wants a total
   chooses which basis it is totalling, and one that wants to show the
   layers needs them apart. Summing at the seam would decide both. */
export const groupCosts = (rows: readonly CostRow[]) =>
  Map.groupBy(rows, (row) => row.trialInternalId);

export const detailOf = (
  run: RunRow,
  cells: readonly CellTaskRow[],
  trialsByCell: ReadonlyMap<string, readonly TrialRow[]>,
  costsByTrial: ReadonlyMap<string, readonly CostRow[]>
): RunDetail => ({
  cells: cells.map((row) => {
    const own = (trialsByCell.get(row.cell.internalId) ?? []).toSorted(
      (left, right) => left.ordinal - right.ordinal
    );

    return {
      caseName: row.caseName,
      cell: row.cell,
      distribution: distributionFor(own),
      prompt: row.prompt,
      repoRef: row.repoRef,
      repoUrl: row.repoUrl,
      prepareName: row.prepareName,
      profile: row.profile,
      trials: own.map((trial) => ({
        ...trial,
        costs: costsByTrial.get(trial.internalId) ?? [],
      })),
      validatorName: row.validatorName,
      verifyCommand: row.verifyCommand,
      workspace: row.workspace,
    };
  }),
  run,
});

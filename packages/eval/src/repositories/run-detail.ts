import type { evalCell } from "@anpord/db/schema/evals/eval-cells";
import type { evalHarnessProfile } from "@anpord/db/schema/evals/eval-harness-profiles";
import type { evalRun } from "@anpord/db/schema/evals/eval-runs";
import type { evalTrialCost } from "@anpord/db/schema/evals/eval-trial-costs";
import type { evalTrial } from "@anpord/db/schema/evals/eval-trials";
import { EvalSourceFiles } from "@anpord/schema/domain/eval-source-files";
import type { EvalSetup } from "@anpord/schema/domain/evals";
import { Schema } from "effect";
import type { Distribution } from "../domain/distribution";
import { distributionFor } from "./trial-distribution";

type CellRow = Omit<typeof evalCell.$inferSelect, "validatorFiles">;
type RunRow = typeof evalRun.$inferSelect;
type TrialRow = typeof evalTrial.$inferSelect;
type CostRow = typeof evalTrialCost.$inferSelect;
type ProfileRow = typeof evalHarnessProfile.$inferSelect;

/** A trial as a reader sees it: the row, and what each layer of it cost. */
interface TrialWithCosts extends TrialRow {
  readonly costs: readonly CostRow[];
}

interface CellTaskRow extends Omit<EvalSetup, "validatorFiles"> {
  readonly caseName: string;
  readonly cell: CellRow;
  readonly profile: ProfileRow | null;
  readonly validatorFiles?: unknown;
}

interface CellWithTrials extends Omit<CellTaskRow, "validatorFiles"> {
  readonly distribution: Distribution;
  readonly trials: readonly TrialWithCosts[];
  readonly validatorFiles?: EvalSetup["validatorFiles"];
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
      validatorFiles: Schema.decodeUnknownSync(EvalSourceFiles)(
        row.validatorFiles ?? []
      ),
      verifyCommand: row.verifyCommand,
      workspace: row.workspace,
    };
  }),
  run,
});

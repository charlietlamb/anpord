import { Database } from "@anpord/db/client";
import { evalCell } from "@anpord/db/schema/evals/eval-cells";
import { evalHarnessProfile } from "@anpord/db/schema/evals/eval-harness-profiles";
import { evalRun } from "@anpord/db/schema/evals/eval-runs";
import type { evalTrial } from "@anpord/db/schema/evals/eval-trials";
import { and, desc, eq } from "drizzle-orm";
import { Effect } from "effect";
import type { CellKey } from "../domain/cell";
import type { Distribution } from "../domain/distribution";
import { cellTrialsQuery } from "./cell-trials-query";
import { tryStore } from "./query";
import { distributionFor, groupByCell } from "./trial-distribution";

type TrialRow = typeof evalTrial.$inferSelect;

export interface CellHistoryEntry {
  readonly distribution: Distribution;
  readonly finishedAt: Date | null;
  readonly harnessVersion: string;
  readonly internalId: string;
  readonly profileVersion: string | null;
  readonly runId: string;
  /** The rows the distribution was computed from. Carried rather than dropped:
   * a cell reads the same way on every repeat, so the readings differ only in
   * their trials and their two versions, and a screen that showed one run at a
   * time made a reader open nine near-identical pages to compare them. */
  readonly trials: readonly TrialRow[];
}

export interface CellHistoryInput {
  readonly cellKey: CellKey;
  readonly limit: number;
  readonly organizationId: string;
}

export const cellHistoryQuery = Effect.gen(function* () {
  const db = yield* Database;
  const trialsForCells = yield* cellTrialsQuery;

  const findCellHistory = (input: CellHistoryInput) =>
    Effect.gen(function* () {
      const cells = yield* tryStore("runQuery.history", () =>
        db
          .select({
            cell: evalCell,
            profileVersion: evalHarnessProfile.version,
            run: evalRun,
          })
          .from(evalCell)
          .innerJoin(evalRun, eq(evalCell.runInternalId, evalRun.internalId))
          .leftJoin(
            evalHarnessProfile,
            eq(evalCell.profileInternalId, evalHarnessProfile.internalId)
          )
          .where(
            and(
              eq(evalCell.cellKey, input.cellKey),
              eq(evalRun.organizationId, input.organizationId)
            )
          )
          .orderBy(desc(evalCell.createdAt))
          .limit(input.limit)
      );

      const trials = yield* trialsForCells(
        cells.map((row) => row.cell.internalId)
      );

      const byCell = groupByCell(trials);

      return cells.map(
        (row): CellHistoryEntry => ({
          distribution: distributionFor(byCell.get(row.cell.internalId) ?? []),
          finishedAt: row.run.finishedAt,
          harnessVersion: row.cell.harnessVersion,
          internalId: row.cell.internalId,
          profileVersion: row.profileVersion,
          runId: row.run.id,
          trials: byCell.get(row.cell.internalId) ?? [],
        })
      );
    }).pipe(Effect.withSpan("RunQuery.findCellHistory"));

  return { findCellHistory };
});

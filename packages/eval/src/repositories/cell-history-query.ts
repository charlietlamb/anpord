import { Database } from "@anpord/db/client";
import { evalCase } from "@anpord/db/schema/evals/eval-cases";
import { evalCell } from "@anpord/db/schema/evals/eval-cells";
import { evalHarnessProfile } from "@anpord/db/schema/evals/eval-harness-profiles";
import { evalRun } from "@anpord/db/schema/evals/eval-runs";
import { evalTask } from "@anpord/db/schema/evals/eval-tasks";
import type { evalTrial } from "@anpord/db/schema/evals/eval-trials";
import { EvalTrigger } from "@anpord/schema/domain/eval-trigger";
import { and, desc, eq, type SQL } from "drizzle-orm";
import { Effect, Schema } from "effect";
import type { CellKey } from "../domain/cell";
import type { Distribution } from "../domain/distribution";
import { cellTrialsQuery } from "./cell-trials-query";
import { tryStore } from "./query";
import { distributionFor, groupByCell } from "./trial-distribution";

type TrialRow = typeof evalTrial.$inferSelect;

export interface CellHistoryEntry {
  readonly definitionHash: string;
  readonly distribution: Distribution;
  readonly finishedAt: Date | null;
  readonly harness: string;
  readonly harnessVersion: string;
  readonly internalId: string;
  readonly local: boolean;
  readonly model: string;
  readonly profileVersion: string | null;
  readonly runId: string;
  readonly sandbox: string;
  /* Carried rather than dropped: repeats of a cell differ only in their trials
     and versions, so one run per screen makes a reader open near-identical pages. */
  readonly trials: readonly TrialRow[];
  readonly trigger: EvalTrigger | null;
}

export interface CaseHistoryInput {
  readonly caseId: string;
  readonly limit: number;
  readonly organizationId: string;
}

export interface CellHistoryInput {
  readonly cellKey: CellKey;
  readonly limit: number;
  readonly organizationId: string;
}

export const cellHistoryQuery = Effect.gen(function* () {
  const db = yield* Database;
  const trialsForCells = yield* cellTrialsQuery;

  const historyWhere = (condition: SQL | undefined, limit: number) =>
    Effect.gen(function* () {
      const cells = yield* tryStore("runQuery.history", () =>
        db
          .select({
            cell: evalCell,
            definitionHash: evalTask.definitionHash,
            profileVersion: evalHarnessProfile.version,
            run: evalRun,
          })
          .from(evalCell)
          .innerJoin(evalRun, eq(evalCell.runInternalId, evalRun.internalId))
          .innerJoin(evalTask, eq(evalTask.internalId, evalCell.taskInternalId))
          .innerJoin(evalCase, eq(evalCase.internalId, evalTask.caseInternalId))
          .leftJoin(
            evalHarnessProfile,
            eq(evalCell.profileInternalId, evalHarnessProfile.internalId)
          )
          .where(condition)
          .orderBy(desc(evalCell.createdAt))
          .limit(limit)
      );

      const trials = yield* trialsForCells(
        cells.map((row) => row.cell.internalId)
      );

      const byCell = groupByCell(trials);

      return cells.map(
        (row): CellHistoryEntry => ({
          definitionHash: row.definitionHash,
          distribution: distributionFor(byCell.get(row.cell.internalId) ?? []),
          finishedAt: row.run.finishedAt,
          harness: row.cell.harness,
          harnessVersion: row.cell.harnessVersion,
          internalId: row.cell.internalId,
          local: row.run.executedBy === "client",
          model: row.cell.model,
          profileVersion: row.profileVersion,
          runId: row.run.id,
          sandbox: row.cell.provider,
          trigger: Schema.decodeUnknownSync(Schema.NullOr(EvalTrigger))(
            row.run.trigger
          ),
          trials: byCell.get(row.cell.internalId) ?? [],
        })
      );
    });

  const findCellHistory = (input: CellHistoryInput) =>
    historyWhere(
      and(
        eq(evalCell.cellKey, input.cellKey),
        eq(evalRun.organizationId, input.organizationId)
      ),
      input.limit
    ).pipe(Effect.withSpan("RunQuery.findCellHistory"));

  const findCaseHistory = (input: CaseHistoryInput) =>
    historyWhere(
      and(
        eq(evalCase.id, input.caseId),
        eq(evalCase.organizationId, input.organizationId)
      ),
      input.limit
    ).pipe(Effect.withSpan("RunQuery.findCaseHistory"));

  return { findCaseHistory, findCellHistory };
});

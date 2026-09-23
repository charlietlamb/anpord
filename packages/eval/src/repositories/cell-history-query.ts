import { Database } from "@anpord/db/client";
import { evalCaseVersion } from "@anpord/db/schema/evals/eval-case-versions";
import { evalCase } from "@anpord/db/schema/evals/eval-cases";
import { evalCell } from "@anpord/db/schema/evals/eval-cells";
import { evalHarnessProfile } from "@anpord/db/schema/evals/eval-harness-profiles";
import { evalRun } from "@anpord/db/schema/evals/eval-runs";
import type { evalTrial } from "@anpord/db/schema/evals/eval-trials";
import { EvalTrigger } from "@anpord/schema/domain/eval-trigger";
import { and, desc, eq, type SQL, sql } from "drizzle-orm";
import { Effect, Schema } from "effect";
import type { CellKey } from "../domain/cell";
import type { Distribution } from "../domain/distribution";
import { type CaseScope, newestCellPerVariant } from "./case-variants";
import { cellTrialsQuery } from "./cell-trials-query";
import { tryStore } from "./query";
import { distributionFor, groupByCell } from "./trial-distribution";

type TrialRow = typeof evalTrial.$inferSelect;

export interface CellHistoryEntry {
  readonly cellKey: string;
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

export interface CaseHistoryInput extends CaseScope {
  readonly cellKey: string | null;
  readonly limit: number;
  readonly offset: number;
}

export interface CaseHistoryPage {
  readonly entries: readonly CellHistoryEntry[];
  readonly total: number;
}

const MAX_VARIANTS = 100;

export interface CellHistoryInput {
  readonly cellKey: CellKey;
  readonly limit: number;
  readonly organizationId: string;
}

export const cellHistoryQuery = Effect.gen(function* () {
  const db = yield* Database;
  const trialsForCells = yield* cellTrialsQuery;

  const historyWhere = (
    condition: SQL | undefined,
    limit: number,
    offset = 0
  ) =>
    Effect.gen(function* () {
      const cells = yield* tryStore("runQuery.history", () =>
        db
          .select({
            cell: evalCell,
            definitionHash: evalCaseVersion.definitionHash,
            profileVersion: evalHarnessProfile.version,
            run: evalRun,
          })
          .from(evalCell)
          .innerJoin(evalRun, eq(evalCell.runInternalId, evalRun.internalId))
          .innerJoin(
            evalCaseVersion,
            eq(evalCaseVersion.internalId, evalCell.caseVersionInternalId)
          )
          .innerJoin(
            evalCase,
            eq(evalCase.internalId, evalCaseVersion.caseInternalId)
          )
          .leftJoin(
            evalHarnessProfile,
            eq(evalCell.profileInternalId, evalHarnessProfile.internalId)
          )
          .where(condition)
          .orderBy(desc(evalCell.createdAt))
          .limit(limit)
          .offset(offset)
      );

      const trials = yield* trialsForCells(
        cells.map((row) => row.cell.internalId)
      );

      const byCell = groupByCell(trials);

      return cells.map(
        (row): CellHistoryEntry => ({
          cellKey: row.cell.cellKey,
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

  const countWhere = (condition: SQL | undefined) =>
    tryStore("runQuery.historyCount", () =>
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(evalCell)
        .innerJoin(
          evalCaseVersion,
          eq(evalCaseVersion.internalId, evalCell.caseVersionInternalId)
        )
        .innerJoin(
          evalCase,
          eq(evalCase.internalId, evalCaseVersion.caseInternalId)
        )
        .where(condition)
    ).pipe(Effect.map((rows) => rows[0]?.total ?? 0));

  const findCaseHistory = (input: CaseHistoryInput) =>
    Effect.gen(function* () {
      const condition = and(
        eq(evalCase.id, input.caseId),
        eq(evalCase.organizationId, input.organizationId),
        input.cellKey === null ? undefined : eq(evalCell.cellKey, input.cellKey)
      );
      const [entries, total] = yield* Effect.all(
        [
          historyWhere(condition, input.limit, input.offset),
          countWhere(condition),
        ],
        { concurrency: "unbounded" }
      );

      return { entries, total } satisfies CaseHistoryPage;
    }).pipe(Effect.withSpan("RunQuery.findCaseHistory"));

  const findCaseVariants = (scope: CaseScope) =>
    historyWhere(newestCellPerVariant(db, scope), MAX_VARIANTS).pipe(
      Effect.withSpan("RunQuery.findCaseVariants")
    );

  return { findCaseHistory, findCaseVariants, findCellHistory };
});

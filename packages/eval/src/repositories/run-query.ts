import { Database } from "@anpord/db/client";
import { evalCell } from "@anpord/db/schema/evals/eval-cells";
import { evalRun } from "@anpord/db/schema/evals/eval-runs";
import { evalTrial } from "@anpord/db/schema/evals/eval-trials";
import { and, desc, eq, inArray } from "drizzle-orm";
import { Context, Effect, Layer, Option } from "effect";
import type { CellKey } from "../domain/cell";
import type { Distribution } from "../domain/distribution";
import type { EvalStoreError } from "../domain/errors";
import { distributionFor, groupByCell } from "./cell-trials";
import { head, tryStore } from "./query";

type CellRow = typeof evalCell.$inferSelect;
type RunRow = typeof evalRun.$inferSelect;
type TrialRow = typeof evalTrial.$inferSelect;

interface CellWithTrials {
  readonly cell: CellRow;
  readonly distribution: Distribution;
  readonly trials: readonly TrialRow[];
}

export interface RunDetail {
  readonly cells: readonly CellWithTrials[];
  readonly run: RunRow;
}

/** One past reading of a cell, newest first. What a baseline is chosen from
 * and what a comparison is measured against. */
export interface CellHistoryEntry {
  readonly distribution: Distribution;
  readonly finishedAt: Date | null;
  readonly internalId: string;
  readonly runId: string;
}

export interface RunQueryShape {
  readonly findCellHistory: (input: {
    readonly cellKey: CellKey;
    readonly limit: number;
    readonly organizationId: string;
  }) => Effect.Effect<readonly CellHistoryEntry[], EvalStoreError>;
  readonly findRun: (
    organizationId: string,
    runId: string
  ) => Effect.Effect<Option.Option<RunDetail>, EvalStoreError>;
  readonly listRuns: (input: {
    readonly limit: number;
    readonly organizationId: string;
  }) => Effect.Effect<readonly RunRow[], EvalStoreError>;
}

export class RunQuery extends Context.Tag("@anpord/eval/RunQuery")<
  RunQuery,
  RunQueryShape
>() {}

export const RunQueryLive = Layer.effect(
  RunQuery,
  Effect.gen(function* () {
    const db = yield* Database;

    const trialsForCells = (cellIds: readonly string[]) =>
      cellIds.length === 0
        ? Effect.succeed([] as readonly TrialRow[])
        : tryStore("runQuery.trials", () =>
            db
              .select()
              .from(evalTrial)
              .where(inArray(evalTrial.cellInternalId, [...cellIds]))
          );

    const findRun = (organizationId: string, runId: string) =>
      Effect.gen(function* () {
        /* Scoped in SQL rather than filtered afterwards: a run id is unique
           per organization, so a bare id predicate reads another tenant's row
           into this process and leaves correctness resting on a later filter. */
        const found = yield* tryStore("runQuery.findRun", () =>
          db
            .select()
            .from(evalRun)
            .where(
              and(
                eq(evalRun.organizationId, organizationId),
                eq(evalRun.id, runId)
              )
            )
        ).pipe(Effect.map(head));

        if (Option.isNone(found)) {
          return Option.none<RunDetail>();
        }

        const run = found.value;

        const cells = yield* tryStore("runQuery.cells", () =>
          db
            .select()
            .from(evalCell)
            .where(eq(evalCell.runInternalId, run.internalId))
        );

        const trials = yield* trialsForCells(
          cells.map((cell) => cell.internalId)
        );

        const byCell = groupByCell(trials);

        return Option.some({
          cells: cells.map((cell) => {
            const own = (byCell.get(cell.internalId) ?? []).sort(
              (left, right) => left.ordinal - right.ordinal
            );

            return {
              cell,
              distribution: distributionFor(own),
              trials: own,
            };
          }),
          run,
        } satisfies RunDetail);
      }).pipe(Effect.withSpan("RunQuery.findRun"));

    const findCellHistory = (input: {
      readonly cellKey: CellKey;
      readonly limit: number;
      readonly organizationId: string;
    }) =>
      Effect.gen(function* () {
        /* Joined to the run rather than trusting the cell key alone: a key is
           a content hash and carries no tenant, so reading it unscoped would
           return another organization's history for an identical task. */
        const cells = yield* tryStore("runQuery.history", () =>
          db
            .select({ cell: evalCell, run: evalRun })
            .from(evalCell)
            .innerJoin(evalRun, eq(evalCell.runInternalId, evalRun.internalId))
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
            distribution: distributionFor(
              byCell.get(row.cell.internalId) ?? []
            ),
            finishedAt: row.run.finishedAt,
            internalId: row.cell.internalId,
            runId: row.run.id,
          })
        );
      }).pipe(Effect.withSpan("RunQuery.findCellHistory"));

    return RunQuery.of({
      findCellHistory,
      findRun,
      listRuns: (input) =>
        tryStore("runQuery.listRuns", () =>
          db
            .select()
            .from(evalRun)
            .where(eq(evalRun.organizationId, input.organizationId))
            .orderBy(desc(evalRun.createdAt))
            .limit(input.limit)
        ).pipe(Effect.withSpan("RunQuery.listRuns")),
    });
  })
);

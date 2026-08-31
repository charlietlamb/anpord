import { Database } from "@anpord/db/client";
import { evalCell } from "@anpord/db/schema/evals/eval-cells";
import { evalRun } from "@anpord/db/schema/evals/eval-runs";
import { evalTask } from "@anpord/db/schema/evals/eval-tasks";
import { evalTrial } from "@anpord/db/schema/evals/eval-trials";
import { and, count, desc, eq, inArray, lt, or } from "drizzle-orm";
import { Context, Effect, Layer, Option } from "effect";
import type { CellKey } from "../domain/cell";
import type { Distribution } from "../domain/distribution";
import type { EvalStoreError } from "../domain/errors";
import type { PageCursor } from "../domain/page";
import type { WorkspaceSource } from "../domain/workspace-source";
import { head, tryStore } from "./query";
import { distributionFor, groupByCell } from "./trial-distribution";

type CellRow = typeof evalCell.$inferSelect;
type TaskSource = Pick<
  typeof evalTask.$inferSelect,
  "repoRef" | "repoUrl" | "sourceFiles" | "sourceKind"
>;

const sourceOf = (row: TaskSource): WorkspaceSource | null => {
  if (row.sourceKind === "empty") {
    return { kind: "empty" };
  }

  if (row.sourceKind === "files" && row.sourceFiles !== null) {
    return { files: row.sourceFiles, kind: "files" };
  }

  if (row.sourceKind === "repo" && row.repoUrl !== null) {
    return { kind: "repo", ref: row.repoRef, url: row.repoUrl };
  }

  return null;
};

export interface CellTask {
  readonly cell: CellRow;
  readonly identity: string;
  readonly name: string;
  readonly prepareName: string | null;
  readonly prepareSource: string | null;
  readonly prompt: string;
  readonly repoRef: string | null;
  readonly repoUrl: string | null;
  readonly source: WorkspaceSource | null;
  readonly validatorName?: string | null;
  readonly validatorSource?: string | null;
  readonly verifyCommand: string | null;
}
type RunRow = typeof evalRun.$inferSelect;
type TrialRow = typeof evalTrial.$inferSelect;
interface CellTaskRow {
  readonly caseName: string;
  readonly cell: CellRow;
  readonly prepareName: string | null;
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

  readonly prompt: string;
  readonly repoRef: string | null;
  readonly repoUrl: string | null;
  readonly trials: readonly TrialRow[];

  readonly validatorName: string | null;
  readonly verifyCommand: string | null;
  readonly workspace: string;
}

export interface RunDetail {
  readonly cells: readonly CellWithTrials[];
  readonly run: RunRow;
}

export interface CellHistoryEntry {
  readonly distribution: Distribution;
  readonly finishedAt: Date | null;
  readonly internalId: string;
  readonly runId: string;
  /** The rows the distribution was computed from. Carried rather than dropped:
   * a cell reads the same way on every repeat, so the readings differ only in
   * their trials, and a screen that showed one run at a time made a reader
   * open nine near-identical pages to compare them. */
  readonly trials: readonly TrialRow[];
}

/**
 * Rows strictly older than where the last page ended.
 *
 * Keyset rather than offset: an offset counts rows the database has already
 * discarded, so page fifty reads fifty pages to return one, and a run started
 * while somebody reads shifts every page after it. A cursor names a position,
 * so it costs the same at page fifty as at page one and cannot skip a row.
 *
 * The id breaks the tie on the timestamp. Two runs started in the same
 * millisecond are ordered by nothing otherwise, and a cursor that cannot tell
 * them apart repeats one of them or loses it.
 */
const cursorBefore = (cursor: PageCursor | null) =>
  cursor === null
    ? undefined
    : or(
        lt(evalRun.createdAt, new Date(cursor.startedAtMillis)),
        and(
          eq(evalRun.createdAt, new Date(cursor.startedAtMillis)),
          lt(evalRun.id, cursor.id)
        )
      );

export interface RunQueryShape {
  /** How many runs the organization has, for a reader who wants to know how
   * far the listing goes. Separate from the page itself because a page is
   * read on every step and this only when the count is shown. */
  readonly countRuns: (
    organizationId: string
  ) => Effect.Effect<number, EvalStoreError>;
  readonly findCellHistory: (input: {
    readonly cellKey: CellKey;
    readonly limit: number;
    readonly organizationId: string;
  }) => Effect.Effect<readonly CellHistoryEntry[], EvalStoreError>;

  readonly findCellTask: (input: {
    readonly cellKey: string;
    readonly organizationId: string;
    readonly runId: string;
  }) => Effect.Effect<Option.Option<CellTask>, EvalStoreError>;
  readonly findRun: (
    organizationId: string,
    runId: string
  ) => Effect.Effect<Option.Option<RunDetail>, EvalStoreError>;
  readonly hydrateRuns: (
    runs: readonly RunRow[]
  ) => Effect.Effect<readonly RunDetail[], EvalStoreError>;
  readonly listRuns: (input: {
    /** Null on the first page. Names where the last one ended rather than how
     * many rows to skip, so a run started between two fetches cannot shift a
     * page under a reader. */
    readonly cursor: PageCursor | null;
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

    const detailOf = (
      run: RunRow,
      cells: readonly CellTaskRow[],
      trialsByCell: ReadonlyMap<string, readonly TrialRow[]>
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
          trials: own,
          validatorName: row.validatorName,
          verifyCommand: row.verifyCommand,
          workspace: row.workspace,
        };
      }),
      run,
    });

    const hydrateRuns = (runs: readonly RunRow[]) =>
      Effect.gen(function* () {
        if (runs.length === 0) {
          return [];
        }

        const cells = yield* tryStore("runQuery.cells", () =>
          db
            .select({
              caseName: evalTask.name,
              cell: evalCell,
              prompt: evalCell.prompt,
              repoRef: evalTask.repoRef,
              repoUrl: evalTask.repoUrl,
              prepareName: evalTask.prepareName,
              prepareSource: evalTask.prepareSource,
              validatorName: evalTask.validatorName,
              verifyCommand: evalTask.verifyCommand,
              workspace: evalTask.workspace,
            })
            .from(evalCell)
            .innerJoin(
              evalTask,
              eq(evalCell.taskInternalId, evalTask.internalId)
            )
            .where(
              inArray(
                evalCell.runInternalId,
                runs.map((run) => run.internalId)
              )
            )
        );

        const trials = yield* trialsForCells(
          cells.map((row) => row.cell.internalId)
        );
        const cellsByRun = Map.groupBy(cells, (row) => row.cell.runInternalId);
        const trialsByCell = groupByCell(trials);

        return runs.map((run) =>
          detailOf(run, cellsByRun.get(run.internalId) ?? [], trialsByCell)
        );
      }).pipe(Effect.withSpan("RunQuery.hydrateRuns"));

    const findRun = (organizationId: string, runId: string) =>
      Effect.gen(function* () {
        const { cells, found } = yield* Effect.all(
          {
            cells: tryStore("runQuery.cells", () =>
              db
                .select({
                  caseName: evalTask.name,
                  cell: evalCell,
                  prompt: evalCell.prompt,
                  repoRef: evalTask.repoRef,
                  repoUrl: evalTask.repoUrl,
                  prepareName: evalTask.prepareName,
                  validatorName: evalTask.validatorName,
                  verifyCommand: evalTask.verifyCommand,
                  workspace: evalTask.workspace,
                })
                .from(evalCell)
                .innerJoin(
                  evalTask,
                  eq(evalCell.taskInternalId, evalTask.internalId)
                )
                .innerJoin(
                  evalRun,
                  eq(evalCell.runInternalId, evalRun.internalId)
                )
                .where(
                  and(
                    eq(evalRun.organizationId, organizationId),
                    eq(evalRun.id, runId)
                  )
                )
            ),
            found: tryStore("runQuery.findRun", () =>
              db
                .select()
                .from(evalRun)
                .where(
                  and(
                    eq(evalRun.organizationId, organizationId),
                    eq(evalRun.id, runId)
                  )
                )
            ).pipe(Effect.map(head)),
          },
          { concurrency: "unbounded" }
        );

        if (Option.isNone(found)) {
          return Option.none<RunDetail>();
        }

        const trials = yield* trialsForCells(
          cells.map((row) => row.cell.internalId)
        );

        return Option.some(detailOf(found.value, cells, groupByCell(trials)));
      }).pipe(Effect.withSpan("RunQuery.findRun"));

    const findCellTask = (input: {
      readonly cellKey: string;
      readonly organizationId: string;
      readonly runId: string;
    }) =>
      tryStore("runQuery.findCellTask", () =>
        db
          .select({
            cell: evalCell,
            identity: evalTask.id,
            name: evalTask.name,
            prompt: evalCell.prompt,
            repoRef: evalTask.repoRef,
            repoUrl: evalTask.repoUrl,
            prepareName: evalTask.prepareName,
            prepareSource: evalTask.prepareSource,
            sourceFiles: evalTask.sourceFiles,
            sourceKind: evalTask.sourceKind,
            validatorName: evalTask.validatorName,
            validatorSource: evalTask.validatorSource,
            verifyCommand: evalTask.verifyCommand,
          })
          .from(evalCell)
          .innerJoin(evalTask, eq(evalCell.taskInternalId, evalTask.internalId))
          .innerJoin(evalRun, eq(evalCell.runInternalId, evalRun.internalId))
          .where(
            and(
              eq(evalCell.cellKey, input.cellKey),
              eq(evalRun.id, input.runId),
              eq(evalRun.organizationId, input.organizationId)
            )
          )
          .limit(1)
      ).pipe(
        Effect.map(head),
        Effect.map(
          Option.map(
            (row): CellTask => ({
              ...row,
              source: sourceOf(row),
            })
          )
        ),
        Effect.withSpan("RunQuery.findCellTask")
      );

    const findCellHistory = (input: {
      readonly cellKey: CellKey;
      readonly limit: number;
      readonly organizationId: string;
    }) =>
      Effect.gen(function* () {
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
            trials: byCell.get(row.cell.internalId) ?? [],
          })
        );
      }).pipe(Effect.withSpan("RunQuery.findCellHistory"));

    return RunQuery.of({
      countRuns: (organizationId) =>
        tryStore("runQuery.countRuns", () =>
          db
            .select({ total: count() })
            .from(evalRun)
            .where(eq(evalRun.organizationId, organizationId))
        ).pipe(
          Effect.map((rows) => rows[0]?.total ?? 0),
          Effect.withSpan("RunQuery.countRuns")
        ),
      findCellHistory,
      findCellTask,
      findRun,
      hydrateRuns,
      listRuns: (input) =>
        tryStore("runQuery.listRuns", () =>
          db
            .select()
            .from(evalRun)
            .where(
              and(
                eq(evalRun.organizationId, input.organizationId),
                cursorBefore(input.cursor)
              )
            )
            .orderBy(desc(evalRun.createdAt), desc(evalRun.id))
            .limit(input.limit + 1)
        ).pipe(Effect.withSpan("RunQuery.listRuns")),
    });
  })
);

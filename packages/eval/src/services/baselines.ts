import { Database } from "@anpord/db/client";
import { evalBaseline } from "@anpord/db/schema/evals/eval-baselines";
import { evalTrial } from "@anpord/db/schema/evals/eval-trials";
import { IdGenerator } from "@anpord/ids/id";
import { and, eq, inArray } from "drizzle-orm";
import { Clock, Context, Effect, Layer, Option } from "effect";
import { CellKey } from "../domain/cell";
import { type Comparison, compare } from "../domain/comparison";
import type { Distribution } from "../domain/distribution";
import type { EvalStoreError } from "../domain/errors";
import { tryStore } from "../repositories/query";
import type { CellHistoryEntry } from "../repositories/run-query";
import { RunQuery } from "../repositories/run-query";
import {
  distributionFor,
  groupByCell,
} from "../repositories/trial-distribution";

export interface Baseline {
  readonly cellInternalId: string;
  readonly cellKey: CellKey;
  readonly distribution: Distribution;
  readonly promotedAt: Date;
}

export interface CellComparison {
  readonly cellKey: CellKey;
  readonly comparison: Option.Option<Comparison>;
}

export interface CellReading {
  readonly cellInternalId: string;
  readonly cellKey: string;
  readonly distribution: Distribution;
}

export interface BaselinesShape {
  readonly compareCells: (
    organizationId: string,
    cells: readonly CellReading[]
  ) => Effect.Effect<readonly CellComparison[], EvalStoreError>;
  readonly compareRun: (
    organizationId: string,
    runId: string
  ) => Effect.Effect<readonly CellComparison[], EvalStoreError>;
  readonly find: (
    organizationId: string,
    cellKey: CellKey
  ) => Effect.Effect<Option.Option<Baseline>, EvalStoreError>;

  readonly history: (input: {
    readonly cellKey: string;
    readonly limit: number;
    readonly organizationId: string;
  }) => Effect.Effect<readonly CellHistoryEntry[], EvalStoreError>;

  readonly promoteIfAbsent: (input: {
    readonly cellInternalId: string;
    readonly cellKey: CellKey;
    readonly organizationId: string;
  }) => Effect.Effect<void, EvalStoreError>;
}

export class Baselines extends Context.Tag("@anpord/eval/Baselines")<
  Baselines,
  BaselinesShape
>() {}

export const BaselinesLive = Layer.effect(
  Baselines,
  Effect.gen(function* () {
    const db = yield* Database;
    const ids = yield* IdGenerator;
    const query = yield* RunQuery;

    const distributionOfCell = (cellInternalId: string) =>
      tryStore("baseline.trials", () =>
        db
          .select()
          .from(evalTrial)
          .where(eq(evalTrial.cellInternalId, cellInternalId))
      ).pipe(Effect.map(distributionFor));

    const find = (organizationId: string, cellKey: CellKey) =>
      Effect.gen(function* () {
        const rows = yield* tryStore("baseline.find", () =>
          db
            .select()
            .from(evalBaseline)
            .where(
              and(
                eq(evalBaseline.organizationId, organizationId),
                eq(evalBaseline.cellKey, cellKey)
              )
            )
        );

        const row = rows.at(0);

        if (row === undefined) {
          return Option.none<Baseline>();
        }

        const distribution = yield* distributionOfCell(row.cellInternalId);

        return Option.some({
          cellInternalId: row.cellInternalId,
          cellKey,
          distribution,
          promotedAt: row.promotedAt,
        } satisfies Baseline);
      }).pipe(Effect.withSpan("Baselines.find"));

    const compareCells = (
      organizationId: string,
      cells: readonly CellReading[]
    ) =>
      Effect.gen(function* () {
        if (cells.length === 0) {
          return [];
        }

        const rows = yield* tryStore("baseline.findMany", () =>
          db
            .select({ baseline: evalBaseline, trial: evalTrial })
            .from(evalBaseline)
            .innerJoin(
              evalTrial,
              eq(evalBaseline.cellInternalId, evalTrial.cellInternalId)
            )
            .where(
              and(
                eq(evalBaseline.organizationId, organizationId),
                inArray(evalBaseline.cellKey, [
                  ...new Set(cells.map((cell) => cell.cellKey)),
                ])
              )
            )
        );
        const byTrialCell = groupByCell(rows.map((row) => row.trial));
        const byKey = new Map(
          rows.map((row) => [
            row.baseline.cellKey,
            {
              cellInternalId: row.baseline.cellInternalId,
              distribution: distributionFor(
                byTrialCell.get(row.baseline.cellInternalId) ?? []
              ),
            },
          ])
        );

        return cells.map((cell): CellComparison => {
          const baseline = byKey.get(cell.cellKey);

          return {
            cellKey: CellKey.make(cell.cellKey),
            comparison:
              baseline === undefined ||
              baseline.cellInternalId === cell.cellInternalId
                ? Option.none()
                : Option.some(
                    compare(baseline.distribution, cell.distribution)
                  ),
          };
        });
      }).pipe(Effect.withSpan("Baselines.compareCells"));

    const promoteIfAbsent = (input: {
      readonly cellInternalId: string;
      readonly cellKey: CellKey;
      readonly organizationId: string;
    }) =>
      Effect.gen(function* () {
        const distribution = yield* distributionOfCell(input.cellInternalId);

        if (distribution.scored === 0) {
          return;
        }

        const internalId = yield* ids.generate("evalBaseline");
        const promotedAt = new Date(yield* Clock.currentTimeMillis);

        yield* tryStore("baseline.promoteIfAbsent", () =>
          db
            .insert(evalBaseline)
            .values({
              cellInternalId: input.cellInternalId,
              cellKey: input.cellKey,
              internalId,
              organizationId: input.organizationId,
              promotedAt,
              promotedBy: null,
            })
            .onConflictDoNothing({
              target: [evalBaseline.organizationId, evalBaseline.cellKey],
            })
        );
      }).pipe(
        Effect.withSpan("Baselines.promoteIfAbsent"),
        Effect.annotateLogs({
          cellInternalId: input.cellInternalId,
          organizationId: input.organizationId,
        })
      );

    const compareRun = (organizationId: string, runId: string) =>
      Effect.gen(function* () {
        const found = yield* query.findRun(organizationId, runId);

        if (Option.isNone(found)) {
          return [];
        }

        return yield* compareCells(
          organizationId,
          found.value.cells.map((cell) => ({
            cellInternalId: cell.cell.internalId,
            cellKey: cell.cell.cellKey,
            distribution: cell.distribution,
          }))
        );
      }).pipe(Effect.withSpan("Baselines.compareRun"));

    return Baselines.of({
      compareCells,
      compareRun,
      find,
      history: (input) =>
        query
          .findCellHistory({
            ...input,
            cellKey: CellKey.make(input.cellKey),
          })
          .pipe(Effect.withSpan("Baselines.history")),
      promoteIfAbsent,
    });
  })
);

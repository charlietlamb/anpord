import { Database } from "@anpord/db/client";
import { evalBaseline } from "@anpord/db/schema/evals/eval-baselines";
import { evalTrial } from "@anpord/db/schema/evals/eval-trials";
import { IdGenerator } from "@anpord/ids/id";
import { and, eq } from "drizzle-orm";
import { Clock, Context, Effect, Layer, Option } from "effect";
import { CellKey } from "../domain/cell";
import { type Comparison, compare } from "../domain/comparison";
import type { Distribution } from "../domain/distribution";
import type { EvalStoreError } from "../domain/errors";
import { tryStore } from "../repositories/query";
import type { CellHistoryEntry } from "../repositories/run-query";
import { RunQuery } from "../repositories/run-query";
import { distributionFor } from "../repositories/trial-distribution";

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

export interface BaselinesShape {
  /** Every cell of a run against its baseline. A cell with no baseline yields
   * `none` rather than a verdict, because nothing has been accepted to compare
   * it with and inventing one would be the drift this service prevents.
   *
   * A cell that is its own baseline yields `none` too. Every cell becomes the
   * reference on its first scored reading, so the run that set it would
   * otherwise report `unchanged` against itself: a verdict with no second
   * reading behind it, sitting above a history that says there is none. */
  readonly compareRun: (
    organizationId: string,
    runId: string
  ) => Effect.Effect<readonly CellComparison[], EvalStoreError>;
  readonly find: (
    organizationId: string,
    cellKey: CellKey
  ) => Effect.Effect<Option.Option<Baseline>, EvalStoreError>;
  /** Past readings of one cell, newest first. What makes a verdict legible:
   * `unchanged` says less than `unchanged since 14 Aug`, and a promotion is a
   * choice between readings rather than a blind accept of the latest.
   *
   * Takes the key as a plain string and brands it here, so a caller at the
   * HTTP edge never has to reach into the domain to cast one. */
  readonly history: (input: {
    readonly cellKey: string;
    readonly limit: number;
    readonly organizationId: string;
  }) => Effect.Effect<readonly CellHistoryEntry[], EvalStoreError>;
  /** Accepts a cell's first scored reading as its reference, and does nothing
   * once one exists. Called as a run finishes so a comparison never depends on
   * someone remembering to press a button: seven in ten cells never got one
   * when this was manual, and a cell without a baseline can report no verdict
   * at all.
   *
   * Improvements do not replace the reference. The bar is what was accepted,
   * so a cell that climbs and then falls back still reports the fall. */
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

    /* Conditional in the insert rather than a read followed by a write: two
       cells of the same key finishing together would both see nothing and the
       second would overwrite the first. The unique index decides instead. */
    const promoteIfAbsent = (input: {
      readonly cellInternalId: string;
      readonly cellKey: CellKey;
      readonly organizationId: string;
    }) =>
      Effect.gen(function* () {
        const distribution = yield* distributionOfCell(input.cellInternalId);

        /* Same rule the manual path enforced: a void reading stored as a
           reference reads as a measured zero and reports a collapse that
           never happened. A cell that scored nothing simply gets no baseline,
           and the next run that scores becomes one. */
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

        return yield* Effect.forEach(found.value.cells, (cell) =>
          find(organizationId, cell.cell.cellKey as CellKey).pipe(
            Effect.map(
              (baseline): CellComparison => ({
                cellKey: cell.cell.cellKey as CellKey,
                comparison: baseline.pipe(
                  Option.filter(
                    (accepted) =>
                      accepted.cellInternalId !== cell.cell.internalId
                  ),
                  Option.map((accepted) =>
                    compare(accepted.distribution, cell.distribution)
                  )
                ),
              })
            )
          )
        );
      }).pipe(Effect.withSpan("Baselines.compareRun"));

    return Baselines.of({
      compareRun,
      find,
      history: (input) =>
        query.findCellHistory({
          ...input,
          cellKey: CellKey.make(input.cellKey),
        }),
      promoteIfAbsent,
    });
  })
);

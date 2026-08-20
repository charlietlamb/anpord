import { Database } from "@anpord/db/client";
import { evalBaseline } from "@anpord/db/schema/evals/eval-baselines";
import { evalCell } from "@anpord/db/schema/evals/eval-cells";
import { evalRun } from "@anpord/db/schema/evals/eval-runs";
import { evalTrial } from "@anpord/db/schema/evals/eval-trials";
import { IdGenerator } from "@anpord/ids/id";
import { and, eq } from "drizzle-orm";
import { Clock, Context, Effect, Layer, Option } from "effect";
import type { CellKey } from "../domain/cell";
import { type Comparison, compare } from "../domain/comparison";
import type { Distribution } from "../domain/distribution";
import { type EvalStoreError, VoidBaseline } from "../domain/errors";
import { distributionFor } from "../repositories/cell-trials";
import { tryStore } from "../repositories/query";
import { RunQuery } from "../repositories/run-query";

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
   * it with and inventing one would be the drift this service prevents. */
  readonly compareRun: (
    organizationId: string,
    runId: string
  ) => Effect.Effect<readonly CellComparison[], EvalStoreError>;
  readonly find: (
    organizationId: string,
    cellKey: CellKey
  ) => Effect.Effect<Option.Option<Baseline>, EvalStoreError>;
  readonly promote: (input: {
    readonly actorId: string | null;
    readonly cellInternalId: string;
    readonly organizationId: string;
  }) => Effect.Effect<Baseline, EvalStoreError | VoidBaseline>;
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

    const promote = (input: {
      readonly actorId: string | null;
      readonly cellInternalId: string;
      readonly organizationId: string;
    }) =>
      Effect.gen(function* () {
        /* Joined to the run so a cell from another tenant cannot be promoted
           by quoting its internal id. */
        const owned = yield* tryStore("baseline.owner", () =>
          db
            .select({ cellKey: evalCell.cellKey })
            .from(evalCell)
            .innerJoin(evalRun, eq(evalCell.runInternalId, evalRun.internalId))
            .where(
              and(
                eq(evalCell.internalId, input.cellInternalId),
                eq(evalRun.organizationId, input.organizationId)
              )
            )
        );

        const cell = owned.at(0);

        if (cell === undefined) {
          return yield* Effect.fail(
            new VoidBaseline({
              cellInternalId: input.cellInternalId,
              reason: "no such cell in this organization",
            })
          );
        }

        const distribution = yield* distributionOfCell(input.cellInternalId);

        /* A promoted void poisons every future comparison: it would be read
           as a measured zero and report a total collapse that never happened,
           or refuse every comparison forever. Refusing here is the only place
           the mistake is still cheap. */
        if (distribution.scored === 0) {
          return yield* Effect.fail(
            new VoidBaseline({
              cellInternalId: input.cellInternalId,
              reason: "the cell has no scored trials",
            })
          );
        }

        const internalId = yield* ids.generate("evalBaseline");
        const cellKey = cell.cellKey as CellKey;
        /* One reading of the clock for both the write and the reply, so the
           value returned cannot disagree with the value stored. */
        const promotedAt = new Date(yield* Clock.currentTimeMillis);

        const rows = yield* tryStore("baseline.promote", () =>
          db
            .insert(evalBaseline)
            .values({
              cellInternalId: input.cellInternalId,
              cellKey,
              internalId,
              organizationId: input.organizationId,
              promotedAt,
              promotedBy: input.actorId,
            })
            .onConflictDoUpdate({
              set: {
                cellInternalId: input.cellInternalId,
                promotedAt,
                promotedBy: input.actorId,
              },
              target: [evalBaseline.organizationId, evalBaseline.cellKey],
            })
            .returning()
        );

        return {
          cellInternalId: input.cellInternalId,
          cellKey,
          distribution,
          promotedAt: rows[0]?.promotedAt ?? promotedAt,
        } satisfies Baseline;
      }).pipe(
        Effect.withSpan("Baselines.promote"),
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
                comparison: Option.map(baseline, (accepted) =>
                  compare(accepted.distribution, cell.distribution)
                ),
              })
            )
          )
        );
      }).pipe(Effect.withSpan("Baselines.compareRun"));

    return Baselines.of({ compareRun, find, promote });
  })
);

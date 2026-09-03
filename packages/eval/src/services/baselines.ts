import { IdGenerator } from "@anpord/ids/id";
import { Clock, Context, Effect, Layer, Option } from "effect";
import { CellKey } from "../domain/cell";
import { compare, type VersionedComparison } from "../domain/comparison";
import type { Distribution } from "../domain/distribution";
import type { EvalStoreError } from "../domain/errors";
import { BaselineRepository } from "../repositories/baseline-repository";
import type { CellHistoryEntry } from "../repositories/cell-history-query";
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
  readonly comparison: Option.Option<VersionedComparison>;
}

export interface CellReading {
  readonly cellInternalId: string;
  readonly cellKey: string;
  readonly distribution: Distribution;
  readonly harnessVersion: string;
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
    const baselines = yield* BaselineRepository;
    const ids = yield* IdGenerator;
    const query = yield* RunQuery;

    const distributionOfCell = (cellInternalId: string) =>
      baselines.trialsOfCell(cellInternalId).pipe(Effect.map(distributionFor));

    const find = (organizationId: string, cellKey: CellKey) =>
      Effect.gen(function* () {
        const row = yield* baselines.find(organizationId, cellKey);

        if (Option.isNone(row)) {
          return Option.none<Baseline>();
        }

        const distribution = yield* distributionOfCell(
          row.value.cellInternalId
        );

        return Option.some({
          cellInternalId: row.value.cellInternalId,
          cellKey,
          distribution,
          promotedAt: row.value.promotedAt,
        } satisfies Baseline);
      }).pipe(Effect.withSpan("Baselines.find"));

    const compareCells = (
      organizationId: string,
      cells: readonly CellReading[]
    ) =>
      Effect.gen(function* () {
        const rows = yield* baselines.findManyWithTrials(
          organizationId,
          cells.map((cell) => cell.cellKey)
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
              harnessVersion: row.harnessVersion,
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
                : Option.some({
                    ...compare(baseline.distribution, cell.distribution),
                    baselineHarnessVersion: baseline.harnessVersion,
                    candidateHarnessVersion: cell.harnessVersion,
                  }),
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

        yield* baselines.insertIfAbsent({
          cellInternalId: input.cellInternalId,
          cellKey: input.cellKey,
          internalId,
          organizationId: input.organizationId,
          promotedAt,
        });
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
            harnessVersion: cell.cell.harnessVersion,
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

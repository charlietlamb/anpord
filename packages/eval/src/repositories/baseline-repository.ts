import { Database } from "@anpord/db/client";
import { evalBaseline } from "@anpord/db/schema/evals/eval-baselines";
import { evalCell } from "@anpord/db/schema/evals/eval-cells";
import { evalTrial } from "@anpord/db/schema/evals/eval-trials";
import { and, eq, inArray } from "drizzle-orm";
import { Context, Effect, Layer, type Option } from "effect";
import type { CellKey } from "../domain/cell";
import type { EvalStoreError } from "../domain/errors";
import { head, tryStore } from "./query";

type TrialRow = typeof evalTrial.$inferSelect;

type BaselineRow = typeof evalBaseline.$inferSelect;

interface BaselineTrialRow {
  readonly baseline: BaselineRow;
  readonly harnessVersion: string;
  readonly trial: TrialRow;
}

export interface BaselineRepositoryShape {
  readonly find: (
    organizationId: string,
    cellKey: CellKey
  ) => Effect.Effect<Option.Option<BaselineRow>, EvalStoreError>;
  readonly findManyWithTrials: (
    organizationId: string,
    cellKeys: readonly string[]
  ) => Effect.Effect<readonly BaselineTrialRow[], EvalStoreError>;
  readonly insertIfAbsent: (
    row: typeof evalBaseline.$inferInsert
  ) => Effect.Effect<void, EvalStoreError>;
  readonly trialsOfCell: (
    cellInternalId: string
  ) => Effect.Effect<readonly TrialRow[], EvalStoreError>;
}

export class BaselineRepository extends Context.Tag(
  "@anpord/eval/BaselineRepository"
)<BaselineRepository, BaselineRepositoryShape>() {}

export const BaselineRepositoryLive = Layer.effect(
  BaselineRepository,
  Effect.gen(function* () {
    const db = yield* Database;

    return BaselineRepository.of({
      find: (organizationId, cellKey) =>
        tryStore("baseline.find", () =>
          db
            .select()
            .from(evalBaseline)
            .where(
              and(
                eq(evalBaseline.organizationId, organizationId),
                eq(evalBaseline.cellKey, cellKey)
              )
            )
        ).pipe(Effect.map(head), Effect.withSpan("BaselineRepository.find")),

      findManyWithTrials: (organizationId, cellKeys) =>
        cellKeys.length === 0
          ? Effect.succeed([])
          : tryStore("baseline.findMany", () =>
              db
                .select({
                  baseline: evalBaseline,
                  harnessVersion: evalCell.harnessVersion,
                  trial: evalTrial,
                })
                .from(evalBaseline)
                .innerJoin(
                  evalCell,
                  eq(evalBaseline.cellInternalId, evalCell.internalId)
                )
                .innerJoin(
                  evalTrial,
                  eq(evalBaseline.cellInternalId, evalTrial.cellInternalId)
                )
                .where(
                  and(
                    eq(evalBaseline.organizationId, organizationId),
                    inArray(evalBaseline.cellKey, [...new Set(cellKeys)])
                  )
                )
            ).pipe(Effect.withSpan("BaselineRepository.findManyWithTrials")),

      insertIfAbsent: (row) =>
        tryStore("baseline.promoteIfAbsent", () =>
          db
            .insert(evalBaseline)
            .values(row)
            .onConflictDoNothing({
              target: [evalBaseline.organizationId, evalBaseline.cellKey],
            })
        ).pipe(
          Effect.asVoid,
          Effect.withSpan("BaselineRepository.insertIfAbsent")
        ),

      trialsOfCell: (cellInternalId) =>
        tryStore("baseline.trials", () =>
          db
            .select()
            .from(evalTrial)
            .where(eq(evalTrial.cellInternalId, cellInternalId))
        ).pipe(Effect.withSpan("BaselineRepository.trialsOfCell")),
    });
  })
);

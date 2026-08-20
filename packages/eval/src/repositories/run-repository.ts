import { Database } from "@anpord/db/client";
import { evalCell } from "@anpord/db/schema/evals/eval-cells";
import { evalRun } from "@anpord/db/schema/evals/eval-runs";
import { IdGenerator } from "@anpord/ids/id";
import { and, eq } from "drizzle-orm";
import { Context, Effect, Layer, type Option } from "effect";
import type { CellKey, HarnessName, ProviderName } from "../domain/cell";
import type { EvalStoreError } from "../domain/errors";
import { head, tryStore } from "./query";

type RunRow = typeof evalRun.$inferSelect;
type CellRow = typeof evalCell.$inferSelect;

interface InsertCell {
  readonly cellKey: CellKey;
  readonly harness: HarnessName;
  readonly harnessVersion: string;
  readonly model: string;
  readonly provider: ProviderName;
  readonly runInternalId: string;
  readonly taskInternalId: string;
}

export interface RunRepositoryShape {
  readonly findById: (
    organizationId: string,
    id: string
  ) => Effect.Effect<Option.Option<RunRow>, EvalStoreError>;
  readonly finish: (
    internalId: string,
    finishedAt: Date
  ) => Effect.Effect<void, EvalStoreError>;
  readonly insert: (input: {
    readonly cellCount: number;
    readonly organizationId: string;
    readonly startedBy: string | null;
    readonly trialCount: number;
  }) => Effect.Effect<RunRow, EvalStoreError>;
  readonly insertCell: (
    input: InsertCell
  ) => Effect.Effect<CellRow, EvalStoreError>;
  /** Every cell of a grid in one statement. A run is cases by tasks, so a
   * per-cell round trip grows with the product of both axes. */
  readonly insertCells: (
    input: readonly InsertCell[]
  ) => Effect.Effect<readonly CellRow[], EvalStoreError>;
}

export class RunRepository extends Context.Tag("@anpord/eval/RunRepository")<
  RunRepository,
  RunRepositoryShape
>() {}

export const RunRepositoryLive = Layer.effect(
  RunRepository,
  Effect.gen(function* () {
    const db = yield* Database;
    const ids = yield* IdGenerator;

    return RunRepository.of({
      /* Scoped in SQL, not in memory. A run id is unique per organization
         rather than globally, so a bare id predicate reads every tenant's
         matching row into this process and leaves correctness resting on a
         filter that a later refactor can drop while still compiling. It also
         cannot use the composite index, so it scans. */
      findById: (organizationId, id) =>
        tryStore("run.findById", () =>
          db
            .select()
            .from(evalRun)
            .where(
              and(
                eq(evalRun.organizationId, organizationId),
                eq(evalRun.id, id)
              )
            )
        ).pipe(Effect.map(head)),

      finish: (internalId, finishedAt) =>
        tryStore("run.finish", () =>
          db
            .update(evalRun)
            .set({ finishedAt, status: "finished" })
            .where(eq(evalRun.internalId, internalId))
        ).pipe(Effect.asVoid),

      insert: (input) =>
        Effect.gen(function* () {
          /* Two prefixes, not two draws from one. The public id is what a
             caller quotes back and the internal id is what rows reference, so
             a call site that swaps them should not typecheck as plausible. */
          const internalId = yield* ids.generate("evalRunInternal");
          const id = yield* ids.generate("evalRun");

          const rows = yield* tryStore("run.insert", () =>
            db
              .insert(evalRun)
              .values({
                cellCount: input.cellCount,
                id,
                internalId,
                organizationId: input.organizationId,
                startedBy: input.startedBy,
                status: "running",
                trialCount: input.trialCount,
              })
              .returning()
          );

          return rows[0] as RunRow;
        }),

      insertCells: (input) =>
        Effect.gen(function* () {
          if (input.length === 0) {
            return [];
          }

          const values = yield* Effect.forEach(input, (cell) =>
            ids.generate("evalCell").pipe(
              Effect.map((internalId) => ({
                cellKey: cell.cellKey,
                harness: cell.harness,
                harnessVersion: cell.harnessVersion,
                internalId,
                model: cell.model,
                provider: cell.provider,
                runInternalId: cell.runInternalId,
                status: "running",
                taskInternalId: cell.taskInternalId,
              }))
            )
          );

          return yield* tryStore("run.insertCells", () =>
            db.insert(evalCell).values(values).returning()
          );
        }),

      insertCell: (input) =>
        Effect.gen(function* () {
          const internalId = yield* ids.generate("evalCell");

          const rows = yield* tryStore("run.insertCell", () =>
            db
              .insert(evalCell)
              .values({
                cellKey: input.cellKey,
                harness: input.harness,
                harnessVersion: input.harnessVersion,
                internalId,
                model: input.model,
                provider: input.provider,
                runInternalId: input.runInternalId,
                status: "running",
                taskInternalId: input.taskInternalId,
              })
              .returning()
          );

          return rows[0] as CellRow;
        }),
    });
  })
);

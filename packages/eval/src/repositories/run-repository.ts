import { Database } from "@anpord/db/client";
import { evalCell } from "@anpord/db/schema/evals/eval-cells";
import { evalRun } from "@anpord/db/schema/evals/eval-runs";
import { IdGenerator } from "@anpord/ids/id";
import { eq } from "drizzle-orm";
import { Context, Effect, Layer, type Option } from "effect";
import type { CellKey, HarnessName, ProviderName } from "../domain/cell";
import type { EvalStoreError } from "../domain/errors";
import { head, tryStore } from "./query";

type RunRow = typeof evalRun.$inferSelect;
type CellRow = typeof evalCell.$inferSelect;

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
  readonly insertCell: (input: {
    readonly cellKey: CellKey;
    readonly harness: HarnessName;
    readonly harnessVersion: string;
    readonly model: string;
    readonly provider: ProviderName;
    readonly runInternalId: string;
    readonly taskInternalId: string;
  }) => Effect.Effect<CellRow, EvalStoreError>;
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
      findById: (organizationId, id) =>
        tryStore("run.findById", () =>
          db.select().from(evalRun).where(eq(evalRun.id, id))
        ).pipe(
          Effect.map((rows) =>
            head(rows.filter((row) => row.organizationId === organizationId))
          )
        ),

      finish: (internalId, finishedAt) =>
        tryStore("run.finish", () =>
          db
            .update(evalRun)
            .set({ finishedAt, status: "finished" })
            .where(eq(evalRun.internalId, internalId))
        ).pipe(Effect.asVoid),

      insert: (input) =>
        Effect.gen(function* () {
          const internalId = yield* ids.generate("evalRun");
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

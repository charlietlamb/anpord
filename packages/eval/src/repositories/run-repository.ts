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
  readonly harnessCredentialConnectionId?: string;
  readonly harnessCredentialRevision?: number;
  readonly harnessVersion: string;
  readonly model: string;
  readonly profileInternalId: string | null;
  readonly prompt: string;
  readonly provider: ProviderName;
  readonly runInternalId: string;
  readonly sandboxCredentialConnectionId?: string;
  readonly sandboxCredentialRevision?: number;
  readonly taskInternalId: string;
}

export interface RunRepositoryShape {
  readonly findById: (
    organizationId: string,
    id: string
  ) => Effect.Effect<Option.Option<RunRow>, EvalStoreError>;
  readonly finish: (input: {
    readonly failure: string | null;
    readonly finishedAt: Date;
    readonly internalId: string;
    readonly status: "failed" | "finished";
  }) => Effect.Effect<void, EvalStoreError>;
  readonly insert: (input: {
    readonly cellCount: number;
    readonly name: string | null;
    readonly organizationId: string;
    readonly startedBy: string | null;
    readonly trialCount: number;
  }) => Effect.Effect<RunRow, EvalStoreError>;
  readonly insertCell: (
    input: InsertCell
  ) => Effect.Effect<CellRow, EvalStoreError>;
  readonly insertCells: (
    input: readonly InsertCell[]
  ) => Effect.Effect<readonly CellRow[], EvalStoreError>;
  /** Puts a finished run back to running, so a resume is not executing work
   * against a row that still says it failed. */
  readonly reopen: (input: {
    readonly internalId: string;
  }) => Effect.Effect<void, EvalStoreError>;

  readonly settleCell: (input: {
    readonly internalId: string;
    readonly status: "failed" | "finished";
  }) => Effect.Effect<void, EvalStoreError>;
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
          db
            .select()
            .from(evalRun)
            .where(
              and(
                eq(evalRun.organizationId, organizationId),
                eq(evalRun.id, id)
              )
            )
        ).pipe(Effect.map(head), Effect.withSpan("RunRepository.findById")),

      finish: (input) =>
        tryStore("run.finish", () =>
          db
            .update(evalRun)
            .set({
              failure: input.failure,
              finishedAt: input.finishedAt,
              status: input.status,
            })
            .where(eq(evalRun.internalId, input.internalId))
        ).pipe(Effect.asVoid, Effect.withSpan("RunRepository.finish")),

      reopen: (input) =>
        tryStore("run.reopen", () =>
          db
            .update(evalRun)
            .set({ failure: null, finishedAt: null, status: "running" })
            .where(eq(evalRun.internalId, input.internalId))
        ).pipe(Effect.asVoid, Effect.withSpan("RunRepository.reopen")),

      insert: (input) =>
        Effect.gen(function* () {
          const internalId = yield* ids.generate("evalRunInternal");
          const id = yield* ids.generate("evalRun");

          const rows = yield* tryStore("run.insert", () =>
            db
              .insert(evalRun)
              .values({
                cellCount: input.cellCount,
                id,
                internalId,
                name: input.name,
                organizationId: input.organizationId,
                startedBy: input.startedBy,
                status: "running",
                trialCount: input.trialCount,
              })
              .returning()
          );

          return rows[0] as RunRow;
        }).pipe(Effect.withSpan("RunRepository.insert")),

      settleCell: (input) =>
        tryStore("run.settleCell", () =>
          db
            .update(evalCell)
            .set({ status: input.status })
            .where(eq(evalCell.internalId, input.internalId))
        ).pipe(Effect.asVoid, Effect.withSpan("RunRepository.settleCell")),

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
                harnessCredentialConnectionId:
                  cell.harnessCredentialConnectionId,
                harnessCredentialRevision: cell.harnessCredentialRevision,
                harnessVersion: cell.harnessVersion,
                internalId,
                model: cell.model,
                profileInternalId: cell.profileInternalId,
                prompt: cell.prompt,
                provider: cell.provider,
                runInternalId: cell.runInternalId,
                sandboxCredentialConnectionId:
                  cell.sandboxCredentialConnectionId,
                sandboxCredentialRevision: cell.sandboxCredentialRevision,
                status: "running",
                taskInternalId: cell.taskInternalId,
              }))
            )
          );

          return yield* tryStore("run.insertCells", () =>
            db.insert(evalCell).values(values).returning()
          );
        }).pipe(Effect.withSpan("RunRepository.insertCells")),

      insertCell: (input) =>
        Effect.gen(function* () {
          const internalId = yield* ids.generate("evalCell");

          const rows = yield* tryStore("run.insertCell", () =>
            db
              .insert(evalCell)
              .values({
                cellKey: input.cellKey,
                harness: input.harness,
                harnessCredentialConnectionId:
                  input.harnessCredentialConnectionId,
                harnessCredentialRevision: input.harnessCredentialRevision,
                harnessVersion: input.harnessVersion,
                internalId,
                model: input.model,
                profileInternalId: input.profileInternalId,
                prompt: input.prompt,
                provider: input.provider,
                runInternalId: input.runInternalId,
                sandboxCredentialConnectionId:
                  input.sandboxCredentialConnectionId,
                sandboxCredentialRevision: input.sandboxCredentialRevision,
                status: "running",
                taskInternalId: input.taskInternalId,
              })
              .onConflictDoUpdate({
                set: { status: "running" },
                target: [evalCell.runInternalId, evalCell.cellKey],
              })
              .returning()
          );

          return rows[0] as CellRow;
        }).pipe(Effect.withSpan("RunRepository.insertCell")),
    });
  })
);

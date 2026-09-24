import { Database } from "@anpord/db/client";
import { evalBatch } from "@anpord/db/schema/evals/eval-batches";
import { evalRun } from "@anpord/db/schema/evals/eval-runs";
import { IdGenerator } from "@anpord/ids/id";
import type { EvalTrigger } from "@anpord/schema/domain/eval-trigger";
import { and, count, eq } from "drizzle-orm";
import { Context, Effect, Layer } from "effect";
import type { EvalStoreError } from "../domain/errors";
import { tryStore } from "./query";

export interface NewRun {
  readonly caseVersionInternalId: string;
  readonly harnessCredentialConnectionId: string | null;
  readonly harnessCredentialRevision: number | null;
  readonly harnessVersion: string;
  readonly profileInternalId: string | null;
  readonly sandboxCredentialConnectionId: string | null;
  readonly sandboxCredentialRevision: number | null;
  readonly trialCount: number;
  readonly variantInternalId: string;
}

export interface NewBatch {
  readonly local: boolean;
  readonly organizationId: string;
  readonly runs: readonly NewRun[];
  readonly startedBy: string | null;
  readonly trigger: EvalTrigger | null;
}

type Settled = "failed" | "finished";

export interface BatchRepositoryShape {
  readonly finish: (input: {
    readonly failure: string | null;
    readonly finishedAt: Date;
    readonly internalId: string;
    readonly status: Settled;
  }) => Effect.Effect<void, EvalStoreError>;
  readonly inFlight: (
    organizationId: string
  ) => Effect.Effect<number, EvalStoreError>;
  readonly insert: (input: NewBatch) => Effect.Effect<
    {
      readonly internalId: string;
      readonly runInternalIds: readonly string[];
    },
    EvalStoreError
  >;
  readonly reopen: (internalId: string) => Effect.Effect<void, EvalStoreError>;
  readonly settleOpenRuns: (input: {
    readonly batchInternalId: string;
    readonly finishedAt: Date;
  }) => Effect.Effect<void, EvalStoreError>;
  readonly settleRun: (input: {
    readonly finishedAt: Date;
    readonly internalId: string;
    readonly status: Settled;
  }) => Effect.Effect<void, EvalStoreError>;
}

export class BatchRepository extends Context.Tag(
  "@anpord/eval/BatchRepository"
)<BatchRepository, BatchRepositoryShape>() {}

export const BatchRepositoryLive = Layer.effect(
  BatchRepository,
  Effect.gen(function* () {
    const db = yield* Database;
    const ids = yield* IdGenerator;

    const insert = (input: NewBatch) =>
      Effect.gen(function* () {
        const internalId = yield* ids.generate("evalBatch");
        const runInternalIds = yield* Effect.forEach(input.runs, () =>
          ids.generate("evalRun")
        );

        yield* tryStore("batch.insert", () =>
          db.transaction(async (tx) => {
            await tx.insert(evalBatch).values({
              internalId,
              local: input.local,
              organizationId: input.organizationId,
              startedBy: input.startedBy,
              status: "running",
              trigger: input.trigger,
            });
            if (input.runs.length > 0) {
              await tx.insert(evalRun).values(
                input.runs.map((run, index) => ({
                  ...run,
                  batchInternalId: internalId,
                  internalId: runInternalIds[index] ?? "",
                  status: "running",
                }))
              );
            }
          })
        );

        return { internalId, runInternalIds };
      }).pipe(
        Effect.withSpan("BatchRepository.insert", {
          attributes: { runs: input.runs.length },
        }),
        Effect.annotateLogs({ organizationId: input.organizationId })
      );

    const finish: BatchRepositoryShape["finish"] = (input) =>
      tryStore("batch.finish", () =>
        db
          .update(evalBatch)
          .set({
            failure: input.failure,
            finishedAt: input.finishedAt,
            status: input.status,
          })
          .where(eq(evalBatch.internalId, input.internalId))
      ).pipe(
        Effect.asVoid,
        Effect.withSpan("BatchRepository.finish", {
          attributes: { batchId: input.internalId, status: input.status },
        })
      );

    const inFlight = (organizationId: string) =>
      tryStore("batch.inFlight", () =>
        db
          .select({ running: count() })
          .from(evalBatch)
          .where(
            and(
              eq(evalBatch.organizationId, organizationId),
              eq(evalBatch.status, "running")
            )
          )
      ).pipe(
        Effect.map((rows) => rows[0]?.running ?? 0),
        Effect.withSpan("BatchRepository.inFlight")
      );

    const reopen = (internalId: string) =>
      tryStore("batch.reopen", () =>
        db
          .update(evalBatch)
          .set({ failure: null, finishedAt: null, status: "running" })
          .where(eq(evalBatch.internalId, internalId))
      ).pipe(
        Effect.asVoid,
        Effect.withSpan("BatchRepository.reopen", {
          attributes: { batchId: internalId },
        })
      );

    const settleRun: BatchRepositoryShape["settleRun"] = (input) =>
      tryStore("batch.settleRun", () =>
        db
          .update(evalRun)
          .set({ finishedAt: input.finishedAt, status: input.status })
          .where(
            and(
              eq(evalRun.internalId, input.internalId),
              eq(evalRun.status, "running")
            )
          )
      ).pipe(
        Effect.asVoid,
        Effect.withSpan("BatchRepository.settleRun", {
          attributes: { runId: input.internalId, status: input.status },
        })
      );

    const settleOpenRuns: BatchRepositoryShape["settleOpenRuns"] = (input) =>
      tryStore("batch.settleOpenRuns", () =>
        db
          .update(evalRun)
          .set({ finishedAt: input.finishedAt, status: "finished" })
          .where(
            and(
              eq(evalRun.batchInternalId, input.batchInternalId),
              eq(evalRun.status, "running")
            )
          )
      ).pipe(Effect.asVoid, Effect.withSpan("BatchRepository.settleOpenRuns"));

    return BatchRepository.of({
      finish,
      inFlight,
      insert,
      reopen,
      settleOpenRuns,
      settleRun,
    });
  })
);

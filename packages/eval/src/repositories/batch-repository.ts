import { Database } from "@anpord/db/client";
import { evalBatch } from "@anpord/db/schema/evals/eval-batches";
import { evalRun } from "@anpord/db/schema/evals/eval-runs";
import { IdGenerator } from "@anpord/ids/id";
import type { EvalTrigger } from "@anpord/schema/domain/eval-trigger";
import type { IdempotencyKey } from "@anpord/schema/public/runner-api";
import { and, count, eq } from "drizzle-orm";
import { Clock, Context, Effect, Layer, Option } from "effect";
import type { EvalStoreError } from "../domain/errors";
import { tryStore } from "./query";
import { unreportedTrials, voidUnreported } from "./unreported-trials";

const UNREPORTED = "not recorded: the machine running this never reported it";

interface NewRun {
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

export interface StartKey {
  readonly key: IdempotencyKey;
  readonly requestHash: string;
}

export interface NewBatch {
  readonly checksIn: boolean;
  readonly idempotency: StartKey | null;
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
    Option.Option<{
      readonly internalId: string;
      readonly runInternalIds: readonly string[];
    }>,
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
  readonly touch: (input: {
    readonly internalId: string;
    readonly seenAt: Date;
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
        const createdAt = new Date(yield* Clock.currentTimeMillis);

        const inserted = yield* tryStore("batch.insert", () =>
          db.transaction(async (tx) => {
            const [batch] = await tx
              .insert(evalBatch)
              .values({
                idempotencyKey: input.idempotency?.key ?? null,
                internalId,
                lastSeenAt: input.local && input.checksIn ? createdAt : null,
                local: input.local,
                organizationId: input.organizationId,
                requestHash: input.idempotency?.requestHash ?? null,
                startedBy: input.startedBy,
                status: "running",
                trigger: input.trigger,
              })
              .onConflictDoNothing({
                target: [evalBatch.organizationId, evalBatch.idempotencyKey],
              })
              .returning({ internalId: evalBatch.internalId });
            if (batch === undefined) {
              return false;
            }
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
            return true;
          })
        );

        return inserted
          ? Option.some({ internalId, runInternalIds })
          : Option.none();
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
          .where(
            and(
              eq(evalBatch.internalId, input.internalId),
              eq(evalBatch.status, "running")
            )
          )
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
              eq(evalBatch.status, "running"),
              eq(evalBatch.local, false)
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

    const touch: BatchRepositoryShape["touch"] = (input) =>
      tryStore("batch.touch", () =>
        db
          .update(evalBatch)
          .set({ lastSeenAt: input.seenAt })
          .where(eq(evalBatch.internalId, input.internalId))
      ).pipe(
        Effect.asVoid,
        Effect.withSpan("BatchRepository.touch", {
          attributes: { batchId: input.internalId },
        })
      );

    const settleOpenRuns: BatchRepositoryShape["settleOpenRuns"] = (input) =>
      Effect.gen(function* () {
        const unreported = yield* unreportedTrials(db, ids, [
          input.batchInternalId,
        ]);

        yield* tryStore("batch.settleOpenRuns", () =>
          db.transaction(async (tx) => {
            await voidUnreported(tx, unreported, {
              failure: UNREPORTED,
              finishedAt: input.finishedAt,
            });
            await tx
              .update(evalRun)
              .set({ finishedAt: input.finishedAt, status: "finished" })
              .where(
                and(
                  eq(evalRun.batchInternalId, input.batchInternalId),
                  eq(evalRun.status, "running")
                )
              );
          })
        );
      }).pipe(
        Effect.withSpan("BatchRepository.settleOpenRuns", {
          attributes: { batchId: input.batchInternalId },
        })
      );

    return BatchRepository.of({
      finish,
      inFlight,
      insert,
      reopen,
      settleOpenRuns,
      settleRun,
      touch,
    });
  })
);

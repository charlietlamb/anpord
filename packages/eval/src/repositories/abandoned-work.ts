import { Database } from "@anpord/db/client";
import { evalBatch } from "@anpord/db/schema/evals/eval-batches";
import { evalRun } from "@anpord/db/schema/evals/eval-runs";
import { evalTrial } from "@anpord/db/schema/evals/eval-trials";
import { IdGenerator } from "@anpord/ids/id";
import { and, eq, exists, inArray, lt, sql } from "drizzle-orm";
import { Clock, Context, Effect, Layer } from "effect";
import type { EvalStoreError } from "../domain/errors";
import { interruptedValidation } from "../domain/validation-plan";
import { tryStore } from "./query";
import { quietLocalBatch } from "./quiet-local-batch";
import { unreportedTrials, voidUnreported } from "./unreported-trials";

const QUIET = "abandoned: the machine running this stopped reporting";

export interface AbandonedWorkShape {
  readonly failBatchesSince: (
    cutoff: Date
  ) => Effect.Effect<number, EvalStoreError>;
  readonly failQuietLocalBatches: (
    quietSince: Date
  ) => Effect.Effect<number, EvalStoreError>;
  readonly failRunsSince: (
    cutoff: Date
  ) => Effect.Effect<number, EvalStoreError>;
  readonly voidTrialsRunningSince: (
    cutoff: Date,
    now: Date
  ) => Effect.Effect<number, EvalStoreError>;
}

export class AbandonedWork extends Context.Tag("@anpord/eval/AbandonedWork")<
  AbandonedWork,
  AbandonedWorkShape
>() {}

export const AbandonedWorkLive = Layer.effect(
  AbandonedWork,
  Effect.gen(function* () {
    const db = yield* Database;
    const ids = yield* IdGenerator;

    const voidTrialsRunningSince = (cutoff: Date, now: Date) =>
      tryStore("reconcile.trials", () =>
        db.transaction(async (tx) => {
          const stale = await tx
            .select({
              internalId: evalTrial.internalId,
              validations: evalTrial.validations,
            })
            .from(evalTrial)
            .where(
              and(
                eq(evalTrial.status, "running"),
                lt(
                  sql`coalesce(${evalTrial.startedAt}, ${evalTrial.createdAt})`,
                  cutoff
                )
              )
            );
          for (const trial of stale) {
            await tx
              .update(evalTrial)
              .set({
                failure: "abandoned: the process running this trial stopped",
                finishedAt: now,
                status: "void",
                validations: (trial.validations ?? []).map((record) =>
                  interruptedValidation(record, now.getTime())
                ),
              })
              .where(eq(evalTrial.internalId, trial.internalId));
          }
          return stale.length;
        })
      );

    const failRunsSince = (cutoff: Date) =>
      tryStore("reconcile.runs", () =>
        db
          .update(evalRun)
          .set({ finishedAt: sql`now()`, status: "failed" })
          .where(
            and(
              eq(evalRun.status, "running"),
              exists(
                db
                  .select({ one: sql`1` })
                  .from(evalBatch)
                  .where(
                    and(
                      eq(evalBatch.internalId, evalRun.batchInternalId),
                      lt(evalBatch.createdAt, cutoff)
                    )
                  )
              )
            )
          )
          .returning({ internalId: evalRun.internalId })
      ).pipe(Effect.map((rows) => rows.length));

    const failBatchesSince = (cutoff: Date) =>
      tryStore("reconcile.batches", () =>
        db
          .update(evalBatch)
          .set({
            failure: "abandoned: the process running this did not finish it",
            finishedAt: sql`now()`,
            status: "failed",
          })
          .where(
            and(
              eq(evalBatch.status, "running"),
              lt(evalBatch.createdAt, cutoff)
            )
          )
          .returning({ internalId: evalBatch.internalId })
      ).pipe(Effect.map((rows) => rows.length));

    const failQuietLocalBatches = (quietSince: Date) =>
      Effect.gen(function* () {
        const quiet = and(
          eq(evalBatch.status, "running"),
          quietLocalBatch(quietSince)
        );
        const candidates = yield* tryStore("reconcile.quietLocalBatches", () =>
          db
            .select({ internalId: evalBatch.internalId })
            .from(evalBatch)
            .where(quiet)
        );
        if (candidates.length === 0) {
          return 0;
        }
        const unreported = yield* unreportedTrials(
          db,
          ids,
          candidates.map((batch) => batch.internalId)
        );
        const finishedAt = new Date(yield* Clock.currentTimeMillis);

        return yield* tryStore("reconcile.quietLocalBatches", () =>
          db.transaction(async (tx) => {
            const failed = await tx
              .update(evalBatch)
              .set({ failure: QUIET, finishedAt, status: "failed" })
              .where(quiet)
              .returning({ internalId: evalBatch.internalId });
            const closed = new Set(failed.map((batch) => batch.internalId));
            await voidUnreported(
              tx,
              unreported.filter((trial) => closed.has(trial.batchInternalId)),
              { failure: QUIET, finishedAt }
            );
            if (closed.size > 0) {
              await tx
                .update(evalRun)
                .set({ finishedAt, status: "failed" })
                .where(
                  and(
                    eq(evalRun.status, "running"),
                    inArray(evalRun.batchInternalId, [...closed])
                  )
                );
            }
            return closed.size;
          })
        );
      });

    return AbandonedWork.of({
      failBatchesSince,
      failQuietLocalBatches,
      failRunsSince,
      voidTrialsRunningSince,
    });
  })
);

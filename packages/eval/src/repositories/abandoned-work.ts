import { Database } from "@anpord/db/client";
import { evalBatch } from "@anpord/db/schema/evals/eval-batches";
import { evalRun } from "@anpord/db/schema/evals/eval-runs";
import { evalTrial } from "@anpord/db/schema/evals/eval-trials";
import { and, eq, exists, lt, sql } from "drizzle-orm";
import { Context, Effect, Layer } from "effect";
import type { EvalStoreError } from "../domain/errors";
import { interruptedValidation } from "../domain/validation-plan";
import { tryStore } from "./query";

export interface AbandonedWorkShape {
  readonly failBatchesSince: (
    cutoff: Date
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
            and(eq(evalBatch.status, "running"), lt(evalBatch.createdAt, cutoff))
          )
          .returning({ internalId: evalBatch.internalId })
      ).pipe(Effect.map((rows) => rows.length));

    return AbandonedWork.of({
      failBatchesSince,
      failRunsSince,
      voidTrialsRunningSince,
    });
  })
);

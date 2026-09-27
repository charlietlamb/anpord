import { Database } from "@anpord/db/client";
import { evalBatch } from "@anpord/db/schema/evals/eval-batches";
import { evalCaseVersion } from "@anpord/db/schema/evals/eval-case-versions";
import { evalCase } from "@anpord/db/schema/evals/eval-cases";
import { evalRun } from "@anpord/db/schema/evals/eval-runs";
import type { StartedBatch } from "@anpord/schema/domain/evals";
import type { IdempotencyKey } from "@anpord/schema/public/runner-api";
import { and, asc, eq } from "drizzle-orm";
import { Effect, Option } from "effect";
import { head, tryStore } from "./query";

export const startedBatchQuery = Effect.gen(function* () {
  const db = yield* Database;

  return (organizationId: string, key: IdempotencyKey) =>
    Effect.gen(function* () {
      const batch = yield* tryStore("startedBatch.batch", () =>
        db
          .select({
            internalId: evalBatch.internalId,
            requestHash: evalBatch.requestHash,
          })
          .from(evalBatch)
          .where(
            and(
              eq(evalBatch.organizationId, organizationId),
              eq(evalBatch.idempotencyKey, key)
            )
          )
      ).pipe(Effect.map(head));
      if (Option.isNone(batch)) {
        return Option.none();
      }

      const runs = yield* tryStore("startedBatch.runs", () =>
        db
          .select({
            caseId: evalCase.id,
            id: evalRun.internalId,
            variantId: evalRun.variantInternalId,
          })
          .from(evalRun)
          .innerJoin(
            evalCaseVersion,
            eq(evalCaseVersion.internalId, evalRun.caseVersionInternalId)
          )
          .innerJoin(
            evalCase,
            eq(evalCase.internalId, evalCaseVersion.caseInternalId)
          )
          .where(eq(evalRun.batchInternalId, batch.value.internalId))
          .orderBy(asc(evalRun.internalId))
      );

      return Option.some({
        requestHash: batch.value.requestHash,
        started: { id: batch.value.internalId, runs } satisfies StartedBatch,
      });
    }).pipe(
      Effect.withSpan("StartedBatch.byKey"),
      Effect.annotateLogs({ organizationId })
    );
});

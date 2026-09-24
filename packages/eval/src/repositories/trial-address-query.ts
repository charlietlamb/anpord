import { Database } from "@anpord/db/client";
import { evalBatch } from "@anpord/db/schema/evals/eval-batches";
import { evalCase } from "@anpord/db/schema/evals/eval-cases";
import { evalRun } from "@anpord/db/schema/evals/eval-runs";
import { evalTrial } from "@anpord/db/schema/evals/eval-trials";
import { evalVariant } from "@anpord/db/schema/evals/eval-variants";
import { and, eq } from "drizzle-orm";
import { Effect } from "effect";
import { head, tryStore } from "./query";

export const trialAddressQuery = Effect.gen(function* () {
  const db = yield* Database;

  return (organizationId: string, trialId: string) =>
    tryStore("trialAddress.find", () =>
      db
        .select({
          batchId: evalBatch.internalId,
          caseId: evalCase.id,
          ordinal: evalTrial.ordinal,
          runId: evalRun.internalId,
          trialId: evalTrial.internalId,
        })
        .from(evalTrial)
        .innerJoin(evalRun, eq(evalRun.internalId, evalTrial.runInternalId))
        .innerJoin(evalBatch, eq(evalBatch.internalId, evalRun.batchInternalId))
        .innerJoin(
          evalVariant,
          eq(evalVariant.internalId, evalRun.variantInternalId)
        )
        .innerJoin(
          evalCase,
          eq(evalCase.internalId, evalVariant.caseInternalId)
        )
        .where(
          and(
            eq(evalTrial.internalId, trialId),
            eq(evalBatch.organizationId, organizationId)
          )
        )
    ).pipe(
      Effect.map(head),
      Effect.withSpan("TrialAddressQuery.find", { attributes: { trialId } })
    );
});

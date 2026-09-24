import { Database } from "@anpord/db/client";
import { evalBatch } from "@anpord/db/schema/evals/eval-batches";
import { evalRun } from "@anpord/db/schema/evals/eval-runs";
import { and, eq } from "drizzle-orm";
import { Effect } from "effect";
import { head, tryStore } from "./query";

export const batchScopeQuery = Effect.gen(function* () {
  const db = yield* Database;

  const batch = (organizationId: string, batchId: string) =>
    tryStore("batchScope.batch", () =>
      db
        .select({ internalId: evalBatch.internalId, local: evalBatch.local })
        .from(evalBatch)
        .where(
          and(
            eq(evalBatch.organizationId, organizationId),
            eq(evalBatch.internalId, batchId)
          )
        )
    ).pipe(Effect.map(head));

  const run = (organizationId: string, runId: string) =>
    tryStore("batchScope.run", () =>
      db
        .select({
          batchInternalId: evalRun.batchInternalId,
          local: evalBatch.local,
        })
        .from(evalRun)
        .innerJoin(evalBatch, eq(evalBatch.internalId, evalRun.batchInternalId))
        .where(
          and(
            eq(evalBatch.organizationId, organizationId),
            eq(evalRun.internalId, runId)
          )
        )
    ).pipe(Effect.map(head));

  return { batch, run };
});

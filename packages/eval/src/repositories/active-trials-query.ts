import { Database } from "@anpord/db/client";
import { evalRun } from "@anpord/db/schema/evals/eval-runs";
import { evalTrial } from "@anpord/db/schema/evals/eval-trials";
import { and, count, eq } from "drizzle-orm";
import { Effect } from "effect";
import { tryStore } from "./query";

export const activeTrialsQuery = Effect.gen(function* () {
  const db = yield* Database;

  return (batchInternalId: string) =>
    tryStore("batch.activeTrials", () =>
      db
        .select({ active: count() })
        .from(evalTrial)
        .innerJoin(evalRun, eq(evalRun.internalId, evalTrial.runInternalId))
        .where(
          and(
            eq(evalRun.batchInternalId, batchInternalId),
            eq(evalTrial.status, "running")
          )
        )
    ).pipe(Effect.map((rows) => rows[0]?.active ?? 0));
});

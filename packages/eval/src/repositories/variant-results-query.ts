import { Database } from "@anpord/db/client";
import { evalRun } from "@anpord/db/schema/evals/eval-runs";
import { evalTrial } from "@anpord/db/schema/evals/eval-trials";
import { evalVariant } from "@anpord/db/schema/evals/eval-variants";
import type { EvalVariantResult } from "@anpord/schema/domain/evals";
import { decodeTrialStatus } from "@anpord/schema/domain/trial";
import { count, desc, eq, inArray } from "drizzle-orm";
import { DateTime, Effect, Option } from "effect";
import { distributionOf } from "../domain/distribution";
import { tryStore } from "./query";
import { variantOf } from "./run-view";

export const variantResultsQuery = Effect.gen(function* () {
  const db = yield* Database;

  return (caseInternalIds: readonly string[]) =>
    Effect.gen(function* () {
      if (caseInternalIds.length === 0) {
        return new Map<string, readonly EvalVariantResult[]>();
      }

      const newest = yield* tryStore("variantResults.newest", () =>
        db
          .selectDistinctOn([evalRun.variantInternalId], {
            run: evalRun,
            variant: evalVariant,
          })
          .from(evalRun)
          .innerJoin(
            evalVariant,
            eq(evalVariant.internalId, evalRun.variantInternalId)
          )
          .where(inArray(evalVariant.caseInternalId, [...caseInternalIds]))
          .orderBy(evalRun.variantInternalId, desc(evalRun.createdAt))
      );

      const variantIds = newest.map((row) => row.variant.internalId);
      const counts = yield* tryStore("variantResults.counts", () =>
        db
          .select({
            runs: count(),
            variantInternalId: evalRun.variantInternalId,
          })
          .from(evalRun)
          .where(inArray(evalRun.variantInternalId, variantIds))
          .groupBy(evalRun.variantInternalId)
      );
      const trials = yield* tryStore("variantResults.trials", () =>
        db
          .select({
            commandCount: evalTrial.commandCount,
            runInternalId: evalTrial.runInternalId,
            status: evalTrial.status,
          })
          .from(evalTrial)
          .where(
            inArray(
              evalTrial.runInternalId,
              newest.map((row) => row.run.internalId)
            )
          )
      );

      const runsOf = new Map(
        counts.map((row) => [row.variantInternalId, row.runs])
      );
      const results = new Map<string, EvalVariantResult[]>();

      for (const row of newest) {
        const variant = variantOf(row.variant);
        if (Option.isNone(variant)) {
          continue;
        }
        const own = trials
          .filter((trial) => trial.runInternalId === row.run.internalId)
          .map((trial) => ({
            commands: trial.commandCount ?? 0,
            status: Option.getOrElse(
              decodeTrialStatus(trial.status),
              () => "void" as const
            ),
          }));
        const caseId = row.variant.caseInternalId;
        results.set(caseId, [
          ...(results.get(caseId) ?? []),
          {
            distribution: distributionOf(own),
            lastRunAt: DateTime.unsafeMake(row.run.createdAt.getTime()),
            lastRunId: row.run.internalId,
            runs: runsOf.get(row.variant.internalId) ?? 0,
            variant: variant.value,
          },
        ]);
      }

      return results;
    }).pipe(Effect.withSpan("VariantResultsQuery.find"));
});

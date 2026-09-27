import type { Database } from "@anpord/db/client";
import { evalRun } from "@anpord/db/schema/evals/eval-runs";
import { evalTrial } from "@anpord/db/schema/evals/eval-trials";
import type { IdGeneratorShape } from "@anpord/ids/id";
import { and, eq, inArray } from "drizzle-orm";
import { Array as Arr, Effect } from "effect";
import type { EvalStoreError } from "../domain/errors";
import { type Tx, tryStore } from "./query";

export interface UnreportedTrial {
  readonly batchInternalId: string;
  readonly internalId: string;
  readonly ordinal: number;
  readonly runInternalId: string;
}

export const unreportedTrials = (
  db: Database["Type"],
  ids: IdGeneratorShape,
  batchInternalIds: readonly string[]
): Effect.Effect<readonly UnreportedTrial[], EvalStoreError> =>
  Effect.gen(function* () {
    if (batchInternalIds.length === 0) {
      return [];
    }
    const runs = yield* tryStore("batch.openRuns", () =>
      db
        .select({
          batchInternalId: evalRun.batchInternalId,
          internalId: evalRun.internalId,
          trialCount: evalRun.trialCount,
        })
        .from(evalRun)
        .where(
          and(
            inArray(evalRun.batchInternalId, [...batchInternalIds]),
            eq(evalRun.status, "running")
          )
        )
    );
    const reported = yield* tryStore("batch.reportedTrials", () =>
      db
        .select({
          ordinal: evalTrial.ordinal,
          runInternalId: evalTrial.runInternalId,
        })
        .from(evalTrial)
        .innerJoin(evalRun, eq(evalRun.internalId, evalTrial.runInternalId))
        .where(inArray(evalRun.batchInternalId, [...batchInternalIds]))
    );
    const seen = new Set(
      reported.map((trial) => `${trial.runInternalId}#${trial.ordinal}`)
    );

    const open = runs.flatMap((run) =>
      Arr.range(1, run.trialCount)
        .filter((ordinal) => !seen.has(`${run.internalId}#${ordinal}`))
        .map((ordinal) => ({
          batchInternalId: run.batchInternalId,
          ordinal,
          runInternalId: run.internalId,
        }))
    );

    return yield* Effect.forEach(open, (trial) =>
      Effect.map(ids.generate("evalTrial"), (internalId) => ({
        ...trial,
        internalId,
      }))
    );
  });

export const voidUnreported = async (
  tx: Tx,
  trials: readonly UnreportedTrial[],
  settled: { readonly failure: string; readonly finishedAt: Date }
) => {
  if (trials.length === 0) {
    return;
  }
  await tx
    .insert(evalTrial)
    .values(
      trials.map((trial) => ({
        failure: settled.failure,
        finishedAt: settled.finishedAt,
        internalId: trial.internalId,
        ordinal: trial.ordinal,
        runInternalId: trial.runInternalId,
        status: "void",
      }))
    )
    .onConflictDoNothing();
};

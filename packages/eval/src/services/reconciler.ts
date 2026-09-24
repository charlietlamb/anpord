import { Clock, Duration, Effect } from "effect";
import { AbandonedWork } from "../repositories/abandoned-work";
import { cutoffBefore, SWEEP_EVERY, sweepEvery } from "./sweep";

const ABANDONED_AFTER = Duration.hours(6);

export const reconcile = (olderThan: Duration.Duration) =>
  Effect.gen(function* () {
    const work = yield* AbandonedWork;
    const cutoff = yield* cutoffBefore(olderThan);
    const now = new Date(yield* Clock.currentTimeMillis);
    const trials = yield* work.voidTrialsRunningSince(cutoff, now);
    const runs = yield* work.failRunsSince(cutoff);
    const batches = yield* work.failBatchesSince(cutoff);

    if (trials + runs + batches > 0) {
      yield* Effect.logWarning("closed abandoned eval work").pipe(
        Effect.annotateLogs({ batches, runs, trials })
      );
    }

    return { batches, runs, trials };
  });

export const ReconcilerScheduleLive = sweepEvery(
  "Reconciler.sweep",
  SWEEP_EVERY,
  reconcile(ABANDONED_AFTER)
);

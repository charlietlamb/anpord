import { Duration, Effect } from "effect";
import { ExpiredRows } from "../repositories/expired-rows";
import { cutoffBefore, SWEEP_EVERY, sweepEvery } from "./sweep";

const GRACE = Duration.days(1);

const deleteExpired = Effect.gen(function* () {
  const expired = yield* ExpiredRows;
  const removed = yield* expired.deleteBefore(yield* cutoffBefore(GRACE));

  if (removed.attempts > 0 || removed.verifications > 0) {
    yield* Effect.logInfo("removed expired rows").pipe(
      Effect.annotateLogs(removed)
    );
  }
});

export const ExpirySweepScheduleLive = sweepEvery(
  "ExpirySweep.sweep",
  SWEEP_EVERY,
  deleteExpired
);

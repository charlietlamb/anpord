import { Clock, Duration, Effect, Layer, Schedule } from "effect";
import { ExpiredRows } from "../repositories/expired-rows";
import { SWEEP_EVERY } from "./reconciler";

/* A day past expiry, so a row is never deleted under a request still holding it. */
const GRACE = Duration.days(1);

export const ExpirySweepScheduleLive = Layer.scopedDiscard(
  Effect.gen(function* () {
    const expired = yield* ExpiredRows;

    const sweep = Effect.gen(function* () {
      const now = yield* Clock.currentTimeMillis;
      const removed = yield* expired.deleteBefore(
        new Date(now - Duration.toMillis(GRACE))
      );

      if (removed.attempts > 0 || removed.verifications > 0) {
        yield* Effect.logInfo("removed expired rows").pipe(
          Effect.annotateLogs(removed)
        );
      }
    });

    yield* sweep.pipe(
      Effect.catchAllCause((cause) =>
        Effect.logError("expiry sweep failed", cause)
      ),
      Effect.repeat(Schedule.spaced(SWEEP_EVERY)),
      Effect.forkScoped
    );
  })
);

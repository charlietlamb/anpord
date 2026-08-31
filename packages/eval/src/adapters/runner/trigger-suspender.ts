import { wait } from "@trigger.dev/sdk";
import { Duration, Effect, Layer } from "effect";
import { Suspender } from "../../services/resumable-command";

/* Below this a suspension costs more than it saves: checkpointing and resuming
   is not free, and a wait this short is cheaper simply held. */
const WORTH_SUSPENDING = Duration.seconds(5);

/**
 * Waits by suspending the task rather than by holding the process.
 *
 * A blocking wait bills for every second a sandbox spends installing, which
 * for a long prepare is most of the run. Suspending hands the machine back and
 * bills for the checkpoint: measured at 90 seconds of wall time for 0.4 of
 * billed time, against 90 for 90.
 */
export const SuspenderTrigger = Layer.succeed(
  Suspender,
  Suspender.of({
    waitFor: (duration) =>
      Duration.lessThan(duration, WORTH_SUSPENDING)
        ? Effect.sleep(duration)
        : Effect.tryPromise(() =>
            wait.for({ seconds: Math.ceil(Duration.toMillis(duration) / 1000) })
          ).pipe(
            /* A suspension that cannot be taken is not a reason to lose the
               run: the wait still has to happen, so it happens here. */
            Effect.catchAll(() =>
              Effect.logWarning("could not suspend, waiting in place").pipe(
                Effect.andThen(Effect.sleep(duration))
              )
            )
          ),
  })
);

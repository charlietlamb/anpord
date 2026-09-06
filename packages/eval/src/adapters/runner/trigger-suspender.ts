import { wait } from "@trigger.dev/sdk";
import { Duration, Effect, Layer } from "effect";
import { Suspender } from "../../services/suspender";

/* Below this, checkpointing and resuming costs more than holding the wait. */
const WORTH_SUSPENDING = Duration.seconds(5);

/* Suspending hands the machine back: measured at 90s wall time for 0.4s billed,
   against 90 for 90. */
export const SuspenderTrigger = Layer.succeed(
  Suspender,
  Suspender.of({
    waitFor: (duration) =>
      Duration.lessThan(duration, WORTH_SUSPENDING)
        ? Effect.sleep(duration)
        : Effect.tryPromise(() =>
            wait.for({ seconds: Math.ceil(Duration.toMillis(duration) / 1000) })
          ).pipe(
            /* A suspension that cannot be taken must not lose the run. */
            Effect.catchAll(() =>
              Effect.logWarning("could not suspend, waiting in place").pipe(
                Effect.andThen(Effect.sleep(duration))
              )
            )
          ),
  })
);

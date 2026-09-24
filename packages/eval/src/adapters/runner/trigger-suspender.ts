import { wait } from "@trigger.dev/sdk";
import { Duration, Effect, Layer } from "effect";
import { Suspender } from "../../services/suspender";

const WORTH_SUSPENDING = Duration.seconds(5);

export const SuspenderTrigger = Layer.succeed(
  Suspender,
  Suspender.of({
    waitFor: (duration) =>
      Duration.lessThan(duration, WORTH_SUSPENDING)
        ? Effect.sleep(duration)
        : Effect.tryPromise(() =>
            wait.for({ seconds: Math.ceil(Duration.toMillis(duration) / 1000) })
          ).pipe(
            Effect.catchAll(() =>
              Effect.logWarning("could not suspend, waiting in place").pipe(
                Effect.andThen(Effect.sleep(duration))
              )
            )
          ),
  })
);

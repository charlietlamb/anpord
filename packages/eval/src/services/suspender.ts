import { Context, type Duration, Effect, Layer } from "effect";

/* A tag rather than a sleep so the worker can checkpoint and release its machine
   instead of billing for the wait. */
export interface SuspenderShape {
  readonly waitFor: (duration: Duration.Duration) => Effect.Effect<void>;
}

export class Suspender extends Context.Tag("@anpord/eval/Suspender")<
  Suspender,
  SuspenderShape
>() {}

export const SuspenderSleeping = Layer.succeed(
  Suspender,
  Suspender.of({ waitFor: (duration) => Effect.sleep(duration) })
);

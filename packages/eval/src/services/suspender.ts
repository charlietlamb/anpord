import { Context, type Duration, Effect, Layer } from "effect";

/**
 * How a run waits between polls of a command it started detached.
 *
 * A tag rather than a sleep, because on the worker a wait long enough to
 * matter is a suspension: the run is checkpointed and its machine released,
 * so nothing is billed for the half hour an install takes.
 */
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

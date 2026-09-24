import { Clock, Duration, Effect, Layer, Schedule } from "effect";

export const SWEEP_EVERY = Duration.minutes(30);

export const cutoffBefore = (olderThan: Duration.Duration) =>
  Clock.currentTimeMillis.pipe(
    Effect.map((now) => new Date(now - Duration.toMillis(olderThan)))
  );

export const sweepEvery = <E, R>(
  name: string,
  every: Duration.Duration,
  sweep: Effect.Effect<unknown, E, R>
) =>
  Layer.scopedDiscard(
    sweep.pipe(
      Effect.catchAllCause((cause) => Effect.logError(`${name} failed`, cause)),
      Effect.repeat(Schedule.spaced(every)),
      Effect.withSpan(name),
      Effect.forkScoped
    )
  );

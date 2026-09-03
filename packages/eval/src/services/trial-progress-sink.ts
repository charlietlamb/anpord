import { Chunk, Effect, Ref, Schedule, Stream } from "effect";
import type { HarnessEvent } from "../domain/harness-event";
import type { TrialProgressShape } from "../ports/trial-progress";

const PROGRESS_BATCH = 32;
const PROGRESS_WINDOW = "400 millis";

const PROGRESS_RETRY = Schedule.exponential("100 millis").pipe(
  Schedule.compose(Schedule.recurs(4))
);

export interface ProgressSink {
  readonly lost: Ref.Ref<boolean>;
  readonly through: <E>(
    events: Stream.Stream<HarnessEvent, E>
  ) => Stream.Stream<HarnessEvent, E>;
}

/* A batch the store refuses marks the journal lost rather than failing the
   stream, which would interrupt every sibling trial in the cell. */
export const progressSink = (
  append: TrialProgressShape["append"] | undefined
): Effect.Effect<ProgressSink> =>
  Effect.gen(function* () {
    const reported = yield* Ref.make(0);
    const lost = yield* Ref.make(false);

    const record = (batch: Chunk.Chunk<HarnessEvent>) =>
      append === undefined
        ? Effect.void
        : Ref.get(reported).pipe(
            Effect.flatMap((from) =>
              append(Chunk.toReadonlyArray(batch), from).pipe(
                Effect.retry(PROGRESS_RETRY),
                Effect.zipRight(Ref.set(reported, from + batch.length))
              )
            ),
            Effect.catchAllCause((cause) =>
              Effect.logWarning("trial progress not recorded", cause).pipe(
                Effect.zipRight(Ref.set(lost, true))
              )
            )
          );

    const through = <E>(events: Stream.Stream<HarnessEvent, E>) =>
      events.pipe(
        Stream.groupedWithin(PROGRESS_BATCH, PROGRESS_WINDOW),
        Stream.tap(record),
        Stream.flattenChunks
      );

    return { lost, through };
  });

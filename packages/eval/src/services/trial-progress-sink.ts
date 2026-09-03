import { Chunk, Effect, Ref, Schedule, Stream } from "effect";
import type { HarnessEvent } from "../domain/harness-event";
import type { TrialProgressShape } from "../ports/trial-progress";

const PROGRESS_BATCH = 32;
const PROGRESS_WINDOW = "400 millis";

/* Five attempts over about a second and a half. Long enough to ride out a
   pool that is momentarily full, short enough that a trial is not held up
   behind a store that is down. */
const PROGRESS_RETRY = Schedule.exponential("100 millis").pipe(
  Schedule.compose(Schedule.recurs(4))
);

export interface ProgressSink {
  /** True once a batch could not be written. The journal on record is then
   * missing events, and a trial scored from it is void, not evidence. */
  readonly lost: Ref.Ref<boolean>;
  readonly through: <E>(
    events: Stream.Stream<HarnessEvent, E>
  ) => Stream.Stream<HarnessEvent, E>;
}

/**
 * Writes a trial's events to the record as they happen, without letting the
 * record slow or stop the trial.
 *
 * A batch that cannot be written after its retries is not dropped silently,
 * which is what happened before: the stream marks the journal as lost and
 * carries on, and the trial settles void. Failing the stream instead would
 * interrupt every sibling trial in the cell, turning one starved connection
 * into fifty void rows.
 */
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

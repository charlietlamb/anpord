import { Clock, Context, Duration, Effect, Layer, Schedule } from "effect";
import type { EvalStoreError } from "../domain/errors";
import { AbandonedWork } from "../repositories/abandoned-work";

interface Reconciled {
  readonly cells: number;
  readonly runs: number;
}

export interface ReconcilerShape {
  readonly sweep: (input: {
    readonly olderThan: Duration.Duration;
  }) => Effect.Effect<Reconciled, EvalStoreError>;
}

export class Reconciler extends Context.Tag("@anpord/eval/Reconciler")<
  Reconciler,
  ReconcilerShape
>() {}

const EMPTY_AFTER = Duration.minutes(5);

export const ReconcilerLive = Layer.effect(
  Reconciler,
  Effect.gen(function* () {
    const abandonedWork = yield* AbandonedWork;

    const sweep = (input: { readonly olderThan: Duration.Duration }) =>
      Effect.gen(function* () {
        const now = yield* Clock.currentTimeMillis;
        const cutoff = new Date(now - Duration.toMillis(input.olderThan));
        const emptyCutoff = new Date(now - Duration.toMillis(EMPTY_AFTER));

        /* Trials first, for the same reason cells come before runs: a reader
           between two statements should never find a closed cell holding a
           trial that still claims to be running. */
        const trials = yield* abandonedWork.voidTrialsRunningSince(cutoff);
        const cells = yield* abandonedWork.failCellsUnderRunsSince(cutoff);
        const stillborn =
          yield* abandonedWork.failRunsWithoutCellsSince(emptyCutoff);
        const runs = yield* abandonedWork.failRunsSince(cutoff);

        if (runs > 0 || cells > 0 || stillborn > 0 || trials > 0) {
          yield* Effect.logWarning("closed abandoned eval work").pipe(
            Effect.annotateLogs({
              cells,
              /* Named for what can be done about it rather than what was
                 done to it, and kept apart from the stillborn count, which
                 registered no cell and so has nothing to continue. */
              resumable: runs,
              stillborn,
              trials,
            })
          );
        }

        return { cells, runs: runs + stillborn };
      }).pipe(Effect.withSpan("Reconciler.sweep"));

    return Reconciler.of({ sweep });
  })
);

const ABANDONED_AFTER = Duration.hours(6);
export const SWEEP_EVERY = Duration.minutes(30);

export const ReconcilerScheduleLive = Layer.scopedDiscard(
  Effect.gen(function* () {
    const reconciler = yield* Reconciler;

    yield* reconciler.sweep({ olderThan: ABANDONED_AFTER }).pipe(
      Effect.catchAllCause((cause) =>
        Effect.logError("reconcile failed", cause)
      ),
      Effect.repeat(Schedule.spaced(SWEEP_EVERY)),
      Effect.forkScoped
    );
  })
);

import { Clock, Config, Duration, Effect, Layer, Schedule } from "effect";
import { JournalArchive } from "../repositories/journal-archive";
import { SWEEP_EVERY } from "./reconciler";

/** How long a settled trial's journal stays as rows before it is folded
 * into one. A month covers every run anybody is still comparing against. */
const HOT_FOR = Duration.days(30);

/** Trials per transaction. Small enough that one batch holds its lock for
 * well under a second, and the loop below takes as many as it needs. */
const BATCH = 200;

/* No service in front of this: a tag whose one method forwards to one
   repository method is a wrapper, not a seam. The schedule yields the
   repository itself. */
export const JournalRetentionScheduleLive = Layer.scopedDiscard(
  Effect.gen(function* () {
    const archive = yield* JournalArchive;
    const hotFor = yield* Config.duration("EVAL_JOURNAL_HOT").pipe(
      Config.withDefault(HOT_FOR)
    );

    const sweep = Effect.gen(function* () {
      const now = yield* Clock.currentTimeMillis;
      const olderThan = new Date(now - Duration.toMillis(hotFor));

      /* A batch as long as the limit may have left more behind, so the loop
         runs until one comes back short. The cutoff is fixed for the whole
         sweep, so a trial settling during it is judged once. */
      const compacted = yield* Effect.iterate(
        { compacted: 0, last: BATCH },
        {
          body: (state) =>
            archive.compact({ limit: BATCH, olderThan }).pipe(
              Effect.map((count) => ({
                compacted: state.compacted + count,
                last: count,
              }))
            ),
          while: (state) => state.last === BATCH,
        }
      ).pipe(Effect.map((state) => state.compacted));

      if (compacted > 0) {
        yield* Effect.logInfo("compacted cold eval journals").pipe(
          Effect.annotateLogs({ trials: compacted })
        );
      }
    }).pipe(
      Effect.catchAllCause((cause) =>
        Effect.logError("journal retention failed", cause)
      ),
      Effect.withSpan("JournalRetention.sweep")
    );

    yield* sweep.pipe(
      Effect.repeat(Schedule.spaced(SWEEP_EVERY)),
      Effect.forkScoped
    );
  })
);

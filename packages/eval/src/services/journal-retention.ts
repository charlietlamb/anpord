import { Config, Duration, Effect } from "effect";
import { JournalArchive } from "../repositories/journal-archive";
import { cutoffBefore, SWEEP_EVERY, sweepEvery } from "./sweep";

const HOT_FOR = Duration.days(30);
const BATCH = 200;

const compactCold = Effect.gen(function* () {
  const archive = yield* JournalArchive;
  const hotFor = yield* Config.duration("EVAL_JOURNAL_HOT").pipe(
    Config.withDefault(HOT_FOR)
  );
  const olderThan = yield* cutoffBefore(hotFor);

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
});

export const JournalRetentionScheduleLive = sweepEvery(
  "JournalRetention.sweep",
  SWEEP_EVERY,
  compactCold
);

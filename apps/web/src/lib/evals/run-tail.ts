import type {
  EvalBatchTail,
  EvalTailEvent,
  EvalTailMark,
} from "@anpord/schema/domain/eval-tail";
import type {
  EvalBatch,
  EvalJournalEntry,
  EvalRun,
  EvalTrial,
} from "@anpord/schema/domain/evals";

type Journals = ReadonlyMap<string, readonly EvalJournalEntry[]>;

export interface HeardTail {
  readonly journals: Journals;
  readonly next: readonly EvalTailMark[];
  readonly running: boolean;
  readonly settled: number | null;
}

export const NOTHING_HEARD: HeardTail = {
  journals: new Map(),
  next: [],
  running: true,
  settled: null,
};

const trialKey = (run: string, ordinal: number) => `${run}#${ordinal}`;

/* One copy per read rather than per event: a catch-up page carries 500 of them,
   and cloning the map for each was quadratic in the number of trials. */
const journalled = (journals: Journals, events: readonly EvalTailEvent[]) => {
  if (events.length === 0) {
    return journals;
  }

  const held = new Map(journals);

  for (const { entry, ordinal, run } of events) {
    const key = trialKey(run, ordinal);
    held.set(key, [...(held.get(key) ?? []), entry]);
  }

  return held;
};

export const heardTail = (held: HeardTail, read: EvalBatchTail): HeardTail => ({
  journals: journalled(held.journals, read.events),
  next: read.next,
  running: read.running,
  settled: read.settled,
});

const following = (
  trial: EvalTrial,
  journal: readonly EvalJournalEntry[] | undefined
): EvalTrial =>
  trial.status !== "running" ||
  journal === undefined ||
  journal.length <= trial.trajectory.length
    ? trial
    : {
        ...trial,
        commands: journal.filter((entry) => entry._tag === "command").length,
        filesChanged: [
          ...new Set(
            journal.flatMap((entry) =>
              entry._tag === "fileChange" ? entry.paths : []
            )
          ),
        ],
        trajectory: journal,
      };

export const overlayTail = (run: EvalRun, journals: Journals): EvalRun => ({
  ...run,
  trials: run.trials.map((trial) =>
    following(trial, journals.get(trialKey(run.id, trial.ordinal)))
  ),
});

export const overlayBatchTail = (
  batch: EvalBatch,
  journals: Journals
): EvalBatch => ({
  ...batch,
  runs: batch.runs.map((run) => overlayTail(run, journals)),
});

import type { EvalJournalEntry } from "@anpord/schema/domain/evals";

/** The wait before a step, drawn on the same row as the step it leads to.
 *
 * Not its own row: thinking and the command it produced are one decision, and
 * splitting them doubled the height of every trajectory to say a thing the eye
 * already reads as a pair.
 *
 * Measured between recorded events, so harness overhead sits inside it. Named
 * for the part that dominates rather than claimed to be only that. */
interface WaterfallLead {
  readonly durationMs: number;
  readonly fromPercent: number;
  readonly widthPercent: number;
}

interface WaterfallBar {
  readonly _tag: "bar";
  readonly durationMs: number;
  readonly entry: Extract<EvalJournalEntry, { _tag: "command" }>;
  readonly lead: WaterfallLead | null;
  readonly leftPercent: number;
  readonly widthPercent: number;
}

interface WaterfallMarker {
  readonly _tag: "marker";
  readonly entry: EvalJournalEntry;
  readonly lead: WaterfallLead | null;
  readonly leftPercent: number;
}

export type WaterfallRow = WaterfallBar | WaterfallMarker;

export interface WaterfallLayout {
  readonly rows: readonly WaterfallRow[];
  readonly spanMs: number;
  /** What the trial spent waiting against what it spent working, which is the
   * finding on a real trajectory: tens of seconds of thinking against a few
   * of commands. */
  readonly thinkingMs: number;
  readonly workingMs: number;
}

const momentOf = (entry: EvalJournalEntry) => entry.finishedAtMillis;

/** Below this a gap is the cost of recording two events, not a decision worth
 * drawing. */
const LEAD_FLOOR_MS = 1;

interface Span {
  readonly entry: Extract<EvalJournalEntry, { _tag: "command" }>;
  readonly finishedAt: number;
  readonly startedAt: number;
}

/** A command with both ends is the only thing that can be drawn as a span. */
const spanOf = (entry: EvalJournalEntry): Span | null => {
  if (entry._tag !== "command") {
    return null;
  }

  const { finishedAtMillis, startedAtMillis } = entry;

  return startedAtMillis === null || finishedAtMillis === null
    ? null
    : { entry, finishedAt: finishedAtMillis, startedAt: startedAtMillis };
};

/**
 * Where each entry sits on the timeline, as percentages of the whole run.
 *
 * Derived rather than stored: subtractions over recorded moments, so there is
 * nothing to keep in sync and nothing to migrate when the drawing changes.
 *
 * The cursor only ever moves forward. A journal is usually chronological but
 * nothing guarantees it, and an entry landing behind the one before it used to
 * drag the cursor back and bill the overlap twice, reporting more thinking
 * than the trial had time for. `spanMs` is never zero, so a trial that
 * finished inside a millisecond divides by one rather than by nothing.
 *
 * An entry the harness reported only once becomes a marker rather than a bar
 * of guessed width. Drawing an invented duration the same way as a measured
 * one is the same lie as a pass rate with no denominator.
 */
export const waterfallLayout = (
  trajectory: readonly EvalJournalEntry[]
): WaterfallLayout => {
  const moments = trajectory
    .flatMap((entry) => {
      const span = spanOf(entry);
      const started = span === null ? [] : [span.startedAt];
      const finished = momentOf(entry);

      return [...started, ...(finished === null ? [] : [finished])];
    })
    .filter((moment): moment is number => moment !== null);

  if (moments.length === 0) {
    return { rows: [], spanMs: 0, thinkingMs: 0, workingMs: 0 };
  }

  const start = Math.min(...moments);
  const end = Math.max(...moments);
  const spanMs = Math.max(end - start, 1);

  const percentOf = (moment: number) => ((moment - start) / spanMs) * 100;

  let previousEnd = start;
  let thinkingMs = 0;
  let workingMs = 0;

  const leadUpTo = (beginsAt: number): WaterfallLead | null => {
    const durationMs = beginsAt - previousEnd;

    if (durationMs < LEAD_FLOOR_MS) {
      return null;
    }

    thinkingMs += durationMs;

    return {
      durationMs,
      fromPercent: percentOf(previousEnd),
      widthPercent: (durationMs / spanMs) * 100,
    };
  };

  const rows = trajectory.flatMap((entry): readonly WaterfallRow[] => {
    const span = spanOf(entry);

    if (span !== null) {
      const durationMs = span.finishedAt - span.startedAt;
      const lead = leadUpTo(span.startedAt);

      previousEnd = Math.max(previousEnd, span.finishedAt);
      workingMs += durationMs;

      return [
        {
          _tag: "bar",
          durationMs,
          entry: span.entry,
          lead,
          leftPercent: percentOf(span.startedAt),
          widthPercent: (durationMs / spanMs) * 100,
        },
      ];
    }

    const moment = momentOf(entry);

    if (moment === null) {
      return [];
    }

    const lead = leadUpTo(moment);

    previousEnd = Math.max(previousEnd, moment);

    return [{ _tag: "marker", entry, lead, leftPercent: percentOf(moment) }];
  });

  return { rows, spanMs, thinkingMs, workingMs };
};

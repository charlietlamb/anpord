import type { EvalJournalEntry } from "@anpord/schema/domain/evals";

interface WaterfallLead {
  readonly durationMs: number;
  readonly fromPercent: number;
  readonly widthPercent: number;
}

/** An entry a harness reported both ends of, so it has a real width. */
type TimedEntry = Extract<EvalJournalEntry, { _tag: "command" | "toolCall" }>;

interface WaterfallBar {
  readonly _tag: "bar";
  readonly durationMs: number;
  readonly entry: TimedEntry;
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

  readonly thinkingMs: number;
  readonly workingMs: number;
}

const momentOf = (entry: EvalJournalEntry) => entry.finishedAtMillis;

const LEAD_FLOOR_MS = 1;

interface Span {
  readonly entry: TimedEntry;
  readonly finishedAt: number;
  readonly startedAt: number;
}

/**
 * The entry as a measured span, or none where it is only an instant.
 *
 * A tool call qualifies on the same terms as a command: both ends reported,
 * or nothing. A harness that says only when a call returned leaves it a
 * marker, because a guessed width drawn like a measured one is the same lie
 * as a rate with no denominator.
 */
const spanOf = (entry: EvalJournalEntry): Span | null => {
  if (entry._tag !== "command" && entry._tag !== "toolCall") {
    return null;
  }

  const { finishedAtMillis } = entry;
  const startedAtMillis = entry.startedAtMillis ?? null;

  return startedAtMillis === null ||
    finishedAtMillis === null ||
    finishedAtMillis <= startedAtMillis
    ? null
    : { entry, finishedAt: finishedAtMillis, startedAt: startedAtMillis };
};

export const waterfallLayout = (
  trajectory: readonly EvalJournalEntry[]
): WaterfallLayout => {
  const moments: number[] = [];

  for (const entry of trajectory) {
    const span = spanOf(entry);
    const finished = momentOf(entry);

    if (span !== null) {
      moments.push(span.startedAt);
    }

    if (finished !== null) {
      moments.push(finished);
    }
  }

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

      /* Commands only. The rail reads this as time spent running commands in
         the sandbox, and a tool call the harness handled itself never went
         near one. */
      if (span.entry._tag === "command") {
        workingMs += durationMs;
      }

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

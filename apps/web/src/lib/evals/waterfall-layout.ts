import type { EvalJournalEntry } from "@anpord/schema/domain/evals";

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

  readonly thinkingMs: number;
  readonly workingMs: number;
}

const momentOf = (entry: EvalJournalEntry) => entry.finishedAtMillis;

const LEAD_FLOOR_MS = 1;

interface Span {
  readonly entry: Extract<EvalJournalEntry, { _tag: "command" }>;
  readonly finishedAt: number;
  readonly startedAt: number;
}

const spanOf = (entry: EvalJournalEntry): Span | null => {
  if (entry._tag !== "command") {
    return null;
  }

  const { finishedAtMillis, startedAtMillis } = entry;

  return startedAtMillis === null || finishedAtMillis === null
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

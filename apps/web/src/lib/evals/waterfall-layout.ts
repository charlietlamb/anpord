import type { EvalJournalEntry } from "@anpord/schema/domain/evals";

interface WaterfallLead {
  readonly durationMs: number;
  readonly fromPercent: number;
  readonly widthPercent: number;
}

type TimedEntry = Extract<EvalJournalEntry, { _tag: "command" | "toolCall" }>;

interface WaterfallBar {
  readonly _tag: "bar";
  readonly durationMs: number;
  readonly entry: TimedEntry;
  readonly lead: WaterfallLead | null;
  readonly leftPercent: number;
  readonly running?: boolean;
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

const finite = (value: number | null | undefined) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const momentOf = (entry: EvalJournalEntry) => finite(entry.finishedAtMillis);

const LEAD_FLOOR_MS = 1;

interface Span {
  readonly entry: TimedEntry;
  readonly finishedAt: number;
  readonly startedAt: number;
}

const spanOf = (entry: EvalJournalEntry): Span | null => {
  if (entry._tag !== "command" && entry._tag !== "toolCall") {
    return null;
  }

  const finishedAtMillis = finite(entry.finishedAtMillis);
  const startedAtMillis = finite(entry.startedAtMillis);

  return startedAtMillis === null ||
    finishedAtMillis === null ||
    finishedAtMillis <= startedAtMillis
    ? null
    : { entry, finishedAt: finishedAtMillis, startedAt: startedAtMillis };
};

const layoutOf = (trajectory: readonly EvalJournalEntry[]): WaterfallLayout => {
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

    const started = finite(
      entry._tag === "command" || entry._tag === "toolCall"
        ? entry.startedAtMillis
        : null
    );

    if (momentOf(entry) === null && started !== null) {
      const lead = leadUpTo(started);
      const durationMs = Math.max(end - started, 0);

      previousEnd = Math.max(previousEnd, started);

      return [
        {
          _tag: "bar",
          durationMs,
          entry: entry as TimedEntry,
          lead,
          leftPercent: percentOf(started),
          running: true,
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

const layouts = new WeakMap<readonly EvalJournalEntry[], WaterfallLayout>();

export const waterfallLayout = (
  trajectory: readonly EvalJournalEntry[]
): WaterfallLayout => {
  const cached = layouts.get(trajectory);

  if (cached !== undefined) {
    return cached;
  }

  const layout = layoutOf(trajectory);
  layouts.set(trajectory, layout);

  return layout;
};

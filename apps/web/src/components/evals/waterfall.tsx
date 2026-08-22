import type { EvalJournalEntry } from "@anpord/schema/domain/evals";
import { Axis, Gridlines } from "@/components/evals/waterfall-axis";
import { OrderedRow, TimedRow } from "@/components/evals/waterfall-row";
import { waterfallLayout } from "@/lib/evals/waterfall-layout";

/* A journal is append-only and ordered, so an entry is identified by where it
   sits and when it happened. */
const keyOf = (entry: EvalJournalEntry, index: number) =>
  [index, entry._tag, entry.finishedAtMillis ?? "unknown"].join("-");

/**
 * The trajectory against a clock.
 *
 * Bars are commands, measured end to end. Markers are the events a harness
 * reports once. The faint line before each is the model thinking, which on a
 * real trial is most of the elapsed time and the view no platform reading a
 * tool-call string can draw.
 *
 * No label column: a command is long enough to push the timeline off the
 * screen, and the tooltip carries it whole rather than truncated.
 *
 * Two branches below the chart, both common. 1552 of 2240 stored trials
 * recorded no journal at all, so the empty state is the ordinary case rather
 * than an edge. A provider that answered in one piece leaves every entry
 * sharing a moment, and bars of no width would claim the work took no time,
 * so that reading falls back to the order it was recorded in.
 */
export function Waterfall({
  timed,
  trajectory,
}: {
  readonly timed: boolean;
  readonly trajectory: readonly EvalJournalEntry[];
}) {
  const { rows, spanMs } = waterfallLayout(trajectory);

  if (trajectory.length === 0) {
    return (
      <p className="py-6 text-center text-muted-foreground text-xs">
        This trial recorded no journal.
      </p>
    );
  }

  if (!timed || rows.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <p className="px-2 text-muted-foreground text-xs">
          Durations are unknown for this trial, so this is the order that was
          recorded rather than a timeline.
        </p>

        <ol className="-mx-2 flex flex-col">
          {trajectory.map((entry, index) => (
            <OrderedRow entry={entry} key={keyOf(entry, index)} />
          ))}
        </ol>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Axis spanMs={spanMs} />

      <div className="relative">
        <Gridlines />

        <ol className="flex flex-col">
          {rows.map((row, index) => (
            <TimedRow key={keyOf(row.entry, index)} row={row} />
          ))}
        </ol>
      </div>
    </div>
  );
}

import type { EvalJournalEntry } from "@anpord/schema/domain/evals";
import { useState } from "react";
import { Axis, Gridlines } from "@/components/evals/waterfall-axis";
import {
  Crosshair,
  useCrosshair,
} from "@/components/evals/waterfall-crosshair";
import { WaterfallDetail } from "@/components/evals/waterfall-detail";
import { OrderedRow, TimedRow } from "@/components/evals/waterfall-row";
import { EmptyNote } from "@/components/layout/empty-note";
import { RowList } from "@/components/layout/row-list";
import { waterfallLayout } from "@/lib/evals/waterfall-layout";

const keyOf = (entry: EvalJournalEntry, index: number) =>
  [index, entry._tag, entry.finishedAtMillis ?? "unknown"].join("-");

const WAITING_ROWS = [
  { delay: "0ms", width: "38%" },
  { delay: "150ms", width: "62%" },
  { delay: "300ms", width: "47%" },
];

function Waiting() {
  return (
    <div className="flex flex-col gap-3 py-4">
      <div aria-hidden="true" className="flex flex-col gap-2">
        {WAITING_ROWS.map((row) => (
          <div
            className="h-4 animate-pulse rounded-sm bg-border-faint motion-reduce:animate-none"
            key={row.width}
            style={{ animationDelay: row.delay, width: row.width }}
          />
        ))}
      </div>

      <p className="text-muted-foreground text-xs">
        Waiting for the first step. The agent reads before it acts.
      </p>
    </div>
  );
}

export function Waterfall({
  running,
  timed,
  trajectory,
}: {
  readonly running: boolean;
  readonly timed: boolean;
  readonly trajectory: readonly EvalJournalEntry[];
}) {
  const { rows, spanMs } = waterfallLayout(trajectory);
  const crosshair = useCrosshair();
  const [selected, setSelected] = useState<string | null>(null);

  const openRow =
    rows.find((row, index) => keyOf(row.entry, index) === selected) ?? null;

  if (trajectory.length === 0) {
    return running ? (
      <Waiting />
    ) : (
      <EmptyNote>This trial recorded no journal.</EmptyNote>
    );
  }

  if (!timed || rows.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <p className="px-2 text-muted-foreground text-xs">
          Durations are unknown for this trial, so this is the order that was
          recorded rather than a timeline.
        </p>

        <RowList as="ol">
          {trajectory.map((entry, index) => (
            <OrderedRow entry={entry} key={keyOf(entry, index)} />
          ))}
        </RowList>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Axis spanMs={spanMs} />

      <div
        className="relative"
        onPointerLeave={crosshair.clear}
        onPointerMove={crosshair.track}
      >
        <Gridlines />
        <Crosshair percent={crosshair.percent} spanMs={spanMs} />

        <ol className="flex flex-col">
          {rows.map((row, index) => {
            const key = keyOf(row.entry, index);

            return (
              <TimedRow
                key={key}
                onSelect={() => setSelected(selected === key ? null : key)}
                row={row}
                selected={selected === key}
              />
            );
          })}
        </ol>
      </div>

      {openRow === null ? null : (
        <WaterfallDetail onClose={() => setSelected(null)} row={openRow} />
      )}
    </div>
  );
}

import type { EvalJournalEntry } from "@anpord/schema/domain/evals";
import { Axis, Gridlines } from "@/components/evals/waterfall-axis";
import {
  Crosshair,
  useCrosshair,
} from "@/components/evals/waterfall-crosshair";
import { StepDetail } from "@/components/evals/waterfall-detail";
import { OrderedRow } from "@/components/evals/waterfall-ordered-row";
import { TimedRow } from "@/components/evals/waterfall-row";
import { EmptyNote } from "@/components/layout/empty-note";
import { RowList } from "@/components/layout/row-list";
import { selectedStepOf } from "@/lib/evals/selected-step";
import { useSelectedStep } from "@/lib/evals/use-selected-step";
import {
  type WaterfallRow,
  waterfallLayout,
} from "@/lib/evals/waterfall-layout";

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
  const [step, setStep] = useSelectedStep();
  const open = selectedStepOf(trajectory, rows, step);
  const at = (row: WaterfallRow) => trajectory.indexOf(row.entry);
  const selectedAt = (row: WaterfallRow) => open?.entry === row.entry;

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
    <div className="flex flex-col gap-3">
      <div className="flex min-w-0 flex-col gap-2">
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
                  onSelect={() => setStep(selectedAt(row) ? null : at(row))}
                  row={row}
                  selected={selectedAt(row)}
                />
              );
            })}
          </ol>
        </div>
      </div>

      {open === null ? null : (
        <aside className="sticky bottom-3 z-20 max-h-[60vh] overflow-auto rounded-lg border bg-card p-4 shadow-xl lg:hidden">
          <StepDetail onClose={() => setStep(null)} step={open} />
        </aside>
      )}
    </div>
  );
}

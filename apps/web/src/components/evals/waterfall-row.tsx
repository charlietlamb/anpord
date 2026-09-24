import { DataTableRow } from "@anpord/ui/components/ui/data-table";
import { cn } from "@anpord/ui/lib/utils";
import { StepLabel } from "@/components/evals/step-label";
import { WaterfallGridlines } from "@/components/evals/waterfall-gridlines";
import { Track } from "@/components/evals/waterfall-track";
import { seconds } from "@/lib/evals/duration";
import { describeRow } from "@/lib/evals/journal-presentation";
import type { WaterfallRow } from "@/lib/evals/waterfall-layout";

const FLIP_PERCENT = 85;

export function TimedRow({
  onSelect,
  row,
  selected,
}: {
  readonly onSelect: () => void;
  readonly row: WaterfallRow;
  readonly selected: boolean;
}) {
  const settled = row._tag === "bar" && row.running !== true;
  const end = row.leftPercent + (row._tag === "bar" ? row.widthPercent : 0);
  const start = row.lead?.fromPercent ?? row.leftPercent;
  const flipped = end > FLIP_PERCENT;

  return (
    <DataTableRow
      aria-label={describeRow(row)}
      aria-pressed={selected}
      className="group"
      render={<button onClick={onSelect} type="button" />}
      selected={selected}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <StepLabel entry={row.entry} />
      </span>

      <span className="relative self-stretch">
        <WaterfallGridlines />
        <Track row={row} />
        {settled ? (
          <span
            className={cn(
              "absolute top-1/2 -translate-y-1/2 text-muted-foreground text-xs tabular-nums",
              flipped ? "-translate-x-full pr-2" : "pl-2"
            )}
            style={{ left: `${flipped ? start : end}%` }}
          >
            {seconds(row.durationMs)}
          </span>
        ) : null}
      </span>
    </DataTableRow>
  );
}

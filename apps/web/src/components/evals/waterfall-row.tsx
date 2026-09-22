import { Tooltip, TooltipTrigger } from "@anpord/ui/components/tooltip";
import { cn } from "@anpord/ui/lib/utils";
import {
  STEP_ROW,
  StepLabel,
  stepRowTone,
} from "@/components/evals/step-label";
import { LABEL_WIDTH } from "@/components/evals/waterfall-scale";
import { RowTooltip } from "@/components/evals/waterfall-tooltip";
import { Track } from "@/components/evals/waterfall-track";
import { seconds } from "@/lib/evals/duration";
import { describeRow } from "@/lib/evals/journal-presentation";
import { spanOfRow, type WaterfallRow } from "@/lib/evals/waterfall-layout";

const LABEL_FLIP_PERCENT = 86;

const INSIDE_PERCENT = 9;

export function TimedRow({
  onSelect,
  row,
  selected,
}: {
  readonly onSelect: () => void;
  readonly row: WaterfallRow;
  readonly selected: boolean;
}) {
  const { to } = spanOfRow(row);
  const inside = row._tag === "bar" && row.widthPercent > INSIDE_PERCENT;
  const flipped = !inside && to > LABEL_FLIP_PERCENT;

  return (
    <li>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              aria-label={describeRow(row)}
              aria-pressed={selected}
              className={cn(STEP_ROW, stepRowTone(selected))}
              onClick={onSelect}
              type="button"
            />
          }
        >
          <span
            className="flex shrink-0 items-center gap-2.5 pr-4 pl-2.5"
            style={{ width: LABEL_WIDTH }}
          >
            <StepLabel entry={row.entry} />
          </span>

          <span className="relative h-full min-w-0 flex-1">
            <Track row={row} />

            {row._tag === "bar" && row.running !== true ? (
              <span
                className={cn(
                  "absolute top-1/2 -translate-y-1/2 font-medium text-[11px] tabular-nums",
                  inside ? "pl-1.5 text-white" : "text-foreground/80",
                  !inside && (flipped ? "-translate-x-full pr-1.5" : "pl-1.5")
                )}
                style={{
                  left: `${inside || flipped ? row.leftPercent : to}%`,
                }}
              >
                {seconds(row.durationMs)}
              </span>
            ) : null}
          </span>
        </TooltipTrigger>

        <RowTooltip row={row} />
      </Tooltip>
    </li>
  );
}

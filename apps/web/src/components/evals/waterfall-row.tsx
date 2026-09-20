import { Tooltip, TooltipTrigger } from "@anpord/ui/components/tooltip";
import { cn } from "@anpord/ui/lib/utils";
import { ExitCode } from "@/components/evals/exit-code";
import { LABEL_WIDTH } from "@/components/evals/waterfall-scale";
import { RowTooltip } from "@/components/evals/waterfall-tooltip";
import { Track } from "@/components/evals/waterfall-track";
import { seconds } from "@/lib/evals/duration";
import {
  describeRow,
  KIND_COLOURS,
  KIND_ICONS,
  kindOf,
  labelOf,
} from "@/lib/evals/journal-presentation";
import { spanOfRow, type WaterfallRow } from "@/lib/evals/waterfall-layout";

/* Past this the duration would run off the chart, so it is set inside. */
const LABEL_FLIP_PERCENT = 82;

export function TimedRow({
  onSelect,
  row,
  selected,
}: {
  readonly onSelect: () => void;
  readonly row: WaterfallRow;
  readonly selected: boolean;
}) {
  const kind = kindOf(row);
  const Glyph = KIND_ICONS[kind];
  const isCommand = row.entry._tag === "command";
  const { to } = spanOfRow(row);
  const flipped = to > LABEL_FLIP_PERCENT;

  return (
    <li>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              aria-label={describeRow(row)}
              aria-pressed={selected}
              className={cn(
                "group flex h-7 w-full cursor-pointer items-center rounded-[3px] text-left transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                selected ? "bg-alpha-8" : "hover:bg-alpha-4"
              )}
              onClick={onSelect}
              type="button"
            />
          }
        >
          <span
            className="flex shrink-0 items-center gap-1.5 pr-3 pl-1"
            style={{ width: LABEL_WIDTH }}
          >
            <Glyph
              aria-hidden="true"
              className="shrink-0"
              size={11}
              style={{ color: KIND_COLOURS[kind] }}
            />

            <span
              className={cn(
                "min-w-0 flex-1 truncate text-[11px] leading-none",
                isCommand
                  ? "font-mono text-foreground/80"
                  : "text-muted-foreground"
              )}
            >
              {labelOf(row.entry)}
            </span>

            {isCommand ? <ExitCode code={row.entry.exitCode} /> : null}
          </span>

          <span className="relative h-full min-w-0 flex-1">
            <Track row={row} />

            {row._tag === "bar" && row.running !== true ? (
              <span
                className={cn(
                  "absolute top-1/2 -translate-y-1/2 text-[10px] tabular-nums transition-colors duration-150 ease-out motion-reduce:transition-none",
                  flipped
                    ? "-translate-x-full pr-1.5 font-medium text-background"
                    : "pl-1.5 text-muted-foreground/70 group-hover:text-foreground"
                )}
                style={{ left: `${to}%` }}
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

import type { EvalJournalEntry } from "@anpord/schema/domain/evals";
import { Tooltip, TooltipTrigger } from "@anpord/ui/components/tooltip";
import { cn } from "@anpord/ui/lib/utils";
import { ExitCode } from "@/components/evals/exit-code";
import {
  JournalOutput,
  useJournalOutput,
} from "@/components/evals/journal-output";
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
import type { WaterfallRow } from "@/lib/evals/waterfall-layout";

/* A bar past this point would run off the chart, so its duration is set
   inside the bar rather than after it. */
const LABEL_FLIP_PERCENT = 72;

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
  const flipped = row.leftPercent > LABEL_FLIP_PERCENT;

  return (
    <li>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              aria-label={describeRow(row)}
              aria-pressed={selected}
              className={cn(
                "group flex h-6 w-full cursor-pointer items-center rounded-sm text-left transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
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

            {row._tag === "bar" ? (
              <span
                className={cn(
                  "absolute top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/70 tabular-nums transition-colors duration-150 ease-out group-hover:text-foreground motion-reduce:transition-none",
                  flipped ? "-translate-x-full pr-1.5" : "pl-1.5"
                )}
                style={{
                  left: `${flipped ? row.leftPercent : row.leftPercent + row.widthPercent}%`,
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

export function OrderedRow({ entry }: { readonly entry: EvalJournalEntry }) {
  const { open, output, toggle } = useJournalOutput(entry);
  const isCommand = entry._tag === "command";

  return (
    <li>
      <button
        className={cn(
          "flex h-7 w-full items-center gap-2 rounded px-2 text-left",
          toggle !== undefined && "hover:bg-muted/40"
        )}
        onClick={toggle}
        type="button"
      >
        <span
          aria-hidden="true"
          className="block size-1.5 shrink-0 rounded-full"
          style={{ background: KIND_COLOURS[entry._tag] }}
        />

        <span
          className={cn(
            "min-w-0 flex-1 truncate text-xs",
            isCommand ? "font-mono text-foreground" : "text-muted-foreground"
          )}
        >
          {labelOf(entry)}
        </span>

        {isCommand ? <ExitCode code={entry.exitCode} /> : null}
      </button>

      {open ? <JournalOutput className="mx-2 mb-2" output={output} /> : null}
    </li>
  );
}

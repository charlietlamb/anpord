import type { EvalJournalEntry } from "@anpord/schema/domain/evals";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@anpord/ui/components/tooltip";
import { ShellBlock } from "@anpord/ui/components/ui/shell-block";
import { cn } from "@anpord/ui/lib/utils";
import {
  JournalOutput,
  useJournalOutput,
} from "@/components/evals/journal-output";
import { seconds } from "@/lib/evals/duration";
import {
  describeRow,
  KIND_COLOURS,
  KIND_ICONS,
  KIND_NAMES,
  kindOf,
  labelOf,
} from "@/lib/evals/journal-presentation";
import type { WaterfallRow } from "@/lib/evals/waterfall-layout";

function ExitCode({ code }: { readonly code: number | null }) {
  if (code === null || code === 0) {
    return null;
  }

  return (
    <span className="w-fit shrink-0 rounded bg-warning/20 px-1.5 py-0.5 font-medium text-warning text-xs tabular-nums">
      exit {code}
    </span>
  );
}

function Track({ row }: { readonly row: WaterfallRow }) {
  const background = KIND_COLOURS[kindOf(row)];
  const from = row.lead === null ? row.leftPercent : row.lead.fromPercent;

  return (
    <>
      {row._tag === "marker" ? (
        <>
          {row.lead === null ? null : (
            <span
              className="absolute top-1/2 block h-1.5 -translate-y-1/2 rounded-full opacity-50"
              style={{
                background,
                left: `${from}%`,
                width: `${row.leftPercent - from}%`,
              }}
            />
          )}

          <span
            className="absolute top-1/2 block size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ background, left: `${row.leftPercent}%` }}
          />
        </>
      ) : (
        <span
          className="absolute top-1/2 block h-1.5 -translate-y-1/2 rounded-full"
          style={{
            background,
            left: `${from}%`,
            minWidth: 3,
            width: `${row.leftPercent + row.widthPercent - from}%`,
          }}
        />
      )}
    </>
  );
}

function RowTooltip({ row }: { readonly row: WaterfallRow }) {
  const kind = kindOf(row);
  const Glyph = KIND_ICONS[kind];
  const ThinkingGlyph = KIND_ICONS.thinking;
  const isCommand = row.entry._tag === "command";
  const { expandable } = useJournalOutput(row.entry);

  return (
    <TooltipContent className="max-w-md">
      <span className="flex flex-col gap-1.5">
        <span className="flex items-center gap-1.5 text-xs opacity-70">
          <Glyph aria-hidden="true" size={13} />
          {KIND_NAMES[kind]}
          {row._tag === "bar" ? ` · ${seconds(row.durationMs)}` : ""}
        </span>

        {isCommand ? (
          <ShellBlock
            className="max-h-40"
            command={labelOf(row.entry)}
            copyable={false}
            tone="inverted"
          />
        ) : (
          <span className="block text-pretty text-xs">
            {labelOf(row.entry)}
          </span>
        )}

        {row.lead === null ? null : (
          <span className="flex items-center gap-1.5 text-xs opacity-70">
            <ThinkingGlyph aria-hidden="true" size={13} />
            {seconds(row.lead.durationMs)} thinking before this
          </span>
        )}

        {isCommand ? <ExitCode code={row.entry.exitCode} /> : null}

        {expandable ? (
          <span className="text-xs opacity-70">
            {isCommand ? "Click to read what it printed" : "Click to read it"}
          </span>
        ) : null}
      </span>
    </TooltipContent>
  );
}

export function TimedRow({ row }: { readonly row: WaterfallRow }) {
  const { expandable, open, output, toggle } = useJournalOutput(row.entry);

  return (
    <li>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              aria-expanded={expandable ? open : undefined}
              aria-label={describeRow(row)}
              className={cn(
                "relative block h-5 w-full rounded-sm text-left transition-colors duration-150 ease-out focus-visible:bg-alpha-4 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",

                expandable
                  ? "cursor-pointer hover:bg-alpha-6"
                  : "cursor-default hover:bg-alpha-4"
              )}
              onClick={toggle}
              type="button"
            />
          }
        >
          <Track row={row} />
        </TooltipTrigger>

        <RowTooltip row={row} />
      </Tooltip>

      {open ? <JournalOutput className="mt-1 mb-2" output={output} /> : null}
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

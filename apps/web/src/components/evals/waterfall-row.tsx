import type { EvalJournalEntry } from "@anpord/schema/domain/evals";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@anpord/ui/components/tooltip";
import { ShellBlock } from "@anpord/ui/components/ui/shell-block";
import { cn } from "@anpord/ui/lib/utils";
import { StackIcon } from "@phosphor-icons/react";
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
import { dollars, percent, tokens } from "@/lib/evals/tokens";
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

/**
 * The narrowest a measured span is drawn.
 *
 * A step that really ran is worth seeing and worth clicking, and on a span of
 * forty seconds a forty-millisecond command comes out around a pixel: too
 * thin to hit, and indistinguishable from the ticks that mean "no duration
 * known". Widening it overstates that one step by a few pixels, which is the
 * cheaper error -- the alternative hides a step that happened.
 *
 * Three pixels was the old floor and still read as a tick. Six is the point
 * at which a bar reads as a bar, and stays inside the eight-pixel gap the
 * axis keeps between its own ticks.
 */
const MIN_BAR = 6;

/* Waiting is drawn hatched and working is drawn solid, so the two read apart
   at a glance without spending a second hue on the distinction. The stripes
   run at 45 degrees over the kind's own colour, which keeps a hatched bar
   recognisably the same thing as the solid one it leads into. */
const hatched = (colour: string) =>
  `repeating-linear-gradient(45deg, ${colour} 0 3px, transparent 3px 6px)`;

/** The lead-in: time the agent spent deciding before this step began. */
function Lead({ row }: { readonly row: WaterfallRow }) {
  if (row.lead === null) {
    return null;
  }

  const colour = KIND_COLOURS.thinking;

  return (
    <span
      className="absolute top-1/2 block h-3 -translate-y-1/2 rounded-[3px] opacity-70 transition-opacity duration-150 ease-out group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
      style={{
        backgroundColor:
          "color-mix(in oklch, var(--trace-thinking) 18%, transparent)",
        backgroundImage: hatched(colour),
        left: `${row.lead.fromPercent}%`,
        width: `${row.lead.widthPercent}%`,
      }}
    />
  );
}

function Track({ row }: { readonly row: WaterfallRow }) {
  const background = KIND_COLOURS[kindOf(row)];

  return (
    <>
      <Lead row={row} />

      {row._tag === "marker" ? (
        /* An instant, not a span: a harness that says only when a step
           finished gives it no width, and a guessed one would be a drawn
           lie. Squared off rather than round so it reads as a tick on the
           timeline instead of a very short bar. */
        <span
          className="absolute top-1/2 block h-3 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-[2px] transition-[filter,width] duration-150 ease-out group-hover:w-[5px] group-hover:brightness-125 group-focus-visible:w-[5px] group-focus-visible:brightness-125 motion-reduce:transition-none"
          style={{ background, left: `${row.leftPercent}%` }}
        />
      ) : (
        <span
          className="absolute top-1/2 block h-3 -translate-y-1/2 rounded-[3px] transition-[filter,transform] duration-150 ease-out group-hover:brightness-125 group-focus-visible:brightness-125 motion-reduce:transition-none"
          style={{
            background,
            left: `${row.leftPercent}%`,
            minWidth: MIN_BAR,
            width: `${row.widthPercent}%`,
          }}
        />
      )}
    </>
  );
}

/**
 * What one turn of the run spent, where the harness reported it per turn.
 *
 * Only a message carries usage, and only from a harness that reports each
 * turn rather than a closing total, so this is absent far more often than it
 * is present. Silent in that case rather than showing a zero, which would
 * claim a turn was free.
 */
function TurnUsage({ entry }: { readonly entry: EvalJournalEntry }) {
  if (entry._tag !== "message") {
    return null;
  }

  const usage = entry.usage;

  if (usage === null || usage === undefined) {
    return null;
  }

  const served =
    usage.inputTokens + usage.cacheReadTokens + usage.cacheWriteTokens;

  return (
    <span className="flex items-center gap-2 text-xs tabular-nums opacity-70">
      <span className="flex items-center gap-1.5">
        <StackIcon aria-hidden="true" size={13} />
        {tokens(usage.totalTokens)}
      </span>

      {served === 0 || usage.cacheReadTokens === 0 ? null : (
        <span>{percent(usage.cacheReadTokens / served)} cached</span>
      )}

      {usage.costUsd === null || usage.costUsd === undefined ? null : (
        <span>{dollars(usage.costUsd)}</span>
      )}
    </span>
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

        <TurnUsage entry={row.entry} />

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
                "group relative block h-6 w-full rounded-sm text-left transition-colors duration-150 ease-out focus-visible:bg-alpha-4 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",

                expandable
                  ? "cursor-pointer hover:bg-alpha-8"
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

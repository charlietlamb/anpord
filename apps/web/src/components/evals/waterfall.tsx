import type { EvalJournalEntry } from "@anpord/schema/domain/evals";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@anpord/ui/components/tooltip";
import { CodeBlock } from "@anpord/ui/components/ui/code-block";
import { ShellBlock } from "@anpord/ui/components/ui/shell-block";
import { cn } from "@anpord/ui/lib/utils";
import {
  BrainIcon,
  ChatCircleDotsIcon,
  FilePlusIcon,
  type Icon,
  TerminalWindowIcon,
  WrenchIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import {
  type WaterfallRow,
  waterfallLayout,
} from "@/lib/evals/waterfall-layout";

const TRUNCATED_AT = 4000;
const TICKS = 4;

/* A journal is append-only and ordered, so an entry is identified by where it
   sits and when it happened. */
const keyOf = (entry: EvalJournalEntry, index: number) =>
  [index, entry._tag, entry.finishedAtMillis ?? "unknown"].join("-");

const seconds = (ms: number) =>
  ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;

const labelOf = (entry: EvalJournalEntry) => {
  if (entry._tag === "command") {
    return entry.command;
  }

  if (entry._tag === "toolCall") {
    return entry.name;
  }

  if (entry._tag === "fileChange") {
    return `wrote ${entry.paths.join(", ")}`;
  }

  return entry.text;
};

type Kind = EvalJournalEntry["_tag"] | "thinking";

/* Four hues that stay apart at six pixels and hold in both themes. The bar is
   the only thing on the row now, so colour is what names the kind and the
   tooltip says it in words. */
const COLOURS: Record<Kind, string> = {
  /* Shell work, the spine of a trajectory. */
  command: "oklch(0.72 0.13 250)",
  /* The only entry that changed anything outside the sandbox. */
  fileChange: "oklch(0.72 0.15 155)",
  /* Said rather than done, so it sits back. */
  message: "oklch(0.6 0.02 250)",
  /* Most of a trial by time, so it stays quieter than the work it separates.
     Quiet, not invisible: at 0.55 lightness it disappeared against the ground
     on a dark theme, and a span nobody can see is one nobody can hover. */
  thinking: "oklch(0.68 0.04 280)",
  /* A tool the harness named, distinct from a shell command. */
  toolCall: "oklch(0.74 0.14 305)",
};

const NAMES: Record<Kind, string> = {
  command: "Command",
  fileChange: "Wrote files",
  message: "Message",
  thinking: "Thinking",
  toolCall: "Tool call",
};

/** One glyph per kind, so a tooltip says what happened before it is read. */
const ICONS: Record<Kind, Icon> = {
  command: TerminalWindowIcon,
  fileChange: FilePlusIcon,
  message: ChatCircleDotsIcon,
  thinking: BrainIcon,
  toolCall: WrenchIcon,
};

const kindOf = (row: WaterfallRow): Kind => row.entry._tag;

/* The row is a bare track, so its only text is in a tooltip a screen reader
   never opens. Without this every row announces as "button". */
const describe = (row: WaterfallRow): string => {
  const took = row._tag === "bar" ? `, ${seconds(row.durationMs)}` : "";
  const after =
    row.lead === null ? "" : `, after ${seconds(row.lead.durationMs)} thinking`;

  return `${NAMES[kindOf(row)]}${took}${after}: ${labelOf(row.entry)}`;
};

function ExitCode({ code }: { readonly code: number | null }) {
  if (code === null || code === 0) {
    return null;
  }

  /* A failing command reads as a fact, not an error. Every real trial hit
     `git status` exit 128 and recovered, and that it recovers consistently is
     the finding rather than a fault to colour red. */
  return (
    <span className="w-fit shrink-0 rounded bg-warning/20 px-1.5 py-0.5 font-medium text-warning text-xs tabular-nums">
      exit {code}
    </span>
  );
}

/* First tick hugs the left edge, last hugs the right, the rest centre on their
   line. Without this the end label overflows the chart. */
const tickShift = (index: number) => {
  if (index === 0) {
    return;
  }

  return index === TICKS ? "translateX(-100%)" : "translateX(-50%)";
};

/** The scale every bar below is read against, so a width means something. */
function Axis({ spanMs }: { readonly spanMs: number }) {
  return (
    <div className="relative h-4">
      {Array.from({ length: TICKS + 1 }, (_, index) => {
        const fraction = index / TICKS;

        return (
          <span
            className="absolute top-0 text-[11px] text-muted-foreground tabular-nums"
            key={fraction}
            style={{
              left: `${fraction * 100}%`,
              transform: tickShift(index),
            }}
          >
            {seconds(Math.round(spanMs * fraction))}
          </span>
        );
      })}
    </div>
  );
}

function Gridlines() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {Array.from({ length: TICKS + 1 }, (_, index) => index / TICKS).map(
        (fraction) => (
          <span
            className="absolute top-0 bottom-0 w-px bg-border/60"
            key={fraction}
            style={{ left: `${fraction * 100}%` }}
          />
        )
      )}
    </div>
  );
}

/** The shape a row draws: the wait that led to it, then the step itself. */
function Track({ row }: { readonly row: WaterfallRow }) {
  const kind = kindOf(row);
  const background = COLOURS[kind];

  return (
    <>
      {/* The wait before this step, on the same line so the pair reads as one
          decision. Thinner and quieter than the work: it is most of the width
          on a real trial, and at equal weight it would read as the subject. */}
      {row.lead === null ? null : (
        <span
          className="absolute top-1/2 block h-px -translate-y-1/2 rounded-full opacity-55"
          style={{
            background: COLOURS.thinking,
            left: `${row.lead.fromPercent}%`,
            width: `${row.lead.widthPercent}%`,
          }}
        />
      )}

      {row._tag === "marker" ? (
        /* One moment, so a dot: a harness reports no span for these, and a
           guessed width drawn like a measured one would be a lie. */
        <span
          className="absolute top-1/2 block size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background, left: `${row.leftPercent}%` }}
        />
      ) : (
        <span
          className="absolute top-1/2 block h-1.5 -translate-y-1/2 rounded-full"
          style={{
            background,
            left: `${row.leftPercent}%`,
            minWidth: 3,
            width: `${row.widthPercent}%`,
          }}
        />
      )}
    </>
  );
}

function RowTooltip({ row }: { readonly row: WaterfallRow }) {
  const kind = kindOf(row);
  const Glyph = ICONS[kind];
  const isCommand = row.entry._tag === "command";

  return (
    <TooltipContent className="max-w-md">
      <span className="flex flex-col gap-1.5">
        <span className="flex items-center gap-1.5 text-xs opacity-70">
          <Glyph aria-hidden="true" size={13} weight="regular" />
          {NAMES[kind]}
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

        {/* The wait that produced this step, named on the row it belongs to
            rather than as a line of its own. */}
        {row.lead === null ? null : (
          <span className="flex items-center gap-1.5 text-xs opacity-70">
            <BrainIcon aria-hidden="true" size={13} weight="regular" />
            {seconds(row.lead.durationMs)} thinking first
          </span>
        )}

        {isCommand ? <ExitCode code={row.entry.exitCode} /> : null}
      </span>
    </TooltipContent>
  );
}

function Row({ row }: { readonly row: WaterfallRow }) {
  const [open, setOpen] = useState(false);
  const output = row.entry._tag === "command" ? row.entry.output : "";
  const expandable = output !== "";

  return (
    <li>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              aria-label={describe(row)}
              /* Feedback on a row that is mostly empty ground: without it a
                 hover lands on nothing and the chart feels inert. */
              className={cn(
                "relative block h-5 w-full rounded-sm text-left transition-colors duration-150 ease-out",
                "hover:bg-foreground/[0.06]"
              )}
              onClick={() => (expandable ? setOpen((was) => !was) : undefined)}
              type="button"
            />
          }
        >
          <Track row={row} />
        </TooltipTrigger>

        <RowTooltip row={row} />
      </Tooltip>

      {open && expandable ? (
        <CodeBlock
          className="mt-1 mb-2 text-muted-foreground"
          copyValue={output}
        >
          {output}
          {output.length >= TRUNCATED_AT ? (
            <span className="text-warning"> [truncated]</span>
          ) : null}
        </CodeBlock>
      ) : null}
    </li>
  );
}

function OrderedRow({ entry }: { readonly entry: EvalJournalEntry }) {
  const [open, setOpen] = useState(false);
  const output = entry._tag === "command" ? entry.output : "";
  const expandable = output !== "";
  const isCommand = entry._tag === "command";

  return (
    <li>
      <button
        className={cn(
          "flex h-7 w-full items-center gap-2 rounded px-2 text-left",
          expandable && "hover:bg-muted/40"
        )}
        onClick={() => (expandable ? setOpen((was) => !was) : undefined)}
        type="button"
      >
        <span
          aria-hidden="true"
          className="block size-1.5 shrink-0 rounded-full"
          style={{ background: COLOURS[entry._tag] }}
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

      {open && expandable ? (
        <CodeBlock
          className="mx-2 mb-2 text-muted-foreground"
          copyValue={output}
        >
          {output}
          {output.length >= TRUNCATED_AT ? (
            <span className="text-warning"> [truncated]</span>
          ) : null}
        </CodeBlock>
      ) : null}
    </li>
  );
}

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
 */
export function Waterfall({
  timed,
  trajectory,
}: {
  readonly timed: boolean;
  readonly trajectory: readonly EvalJournalEntry[];
}) {
  const { rows, spanMs } = waterfallLayout(trajectory);

  /* 1552 of 2240 stored trials recorded nothing, so this is the common case
     rather than the exception. */
  if (trajectory.length === 0) {
    return (
      <p className="py-6 text-center text-muted-foreground text-xs">
        This trial recorded no journal.
      </p>
    );
  }

  /* The provider answered in one piece, so every entry shares a moment. Bars
     of no width would claim work took no time. */
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

      {/* The ticks run the whole height rather than stopping at the axis, so a
          bar is read against the scale instead of against the row above it. */}
      <div className="relative">
        <Gridlines />

        <ol className="flex flex-col">
          {rows.map((row, index) => (
            <Row key={keyOf(row.entry, index)} row={row} />
          ))}
        </ol>
      </div>
    </div>
  );
}

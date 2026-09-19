import type { EvalJournalEntry } from "@anpord/schema/domain/evals";
import { TooltipContent } from "@anpord/ui/components/tooltip";
import { ShellBlock } from "@anpord/ui/components/ui/shell-block";
import { StackIcon } from "@phosphor-icons/react";
import { ExitCode } from "@/components/evals/exit-code";
import { useJournalOutput } from "@/components/evals/journal-output";
import { seconds } from "@/lib/evals/duration";
import {
  KIND_ICONS,
  KIND_NAMES,
  kindOf,
  labelOf,
} from "@/lib/evals/journal-presentation";
import { dollars, percent, tokens } from "@/lib/evals/tokens";
import type { WaterfallRow } from "@/lib/evals/waterfall-layout";

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
        <span>{dollars(usage.costUsd)} est.</span>
      )}
    </span>
  );
}

export function RowTooltip({ row }: { readonly row: WaterfallRow }) {
  const kind = kindOf(row);
  const Glyph = KIND_ICONS[kind];
  const ThinkingGlyph = KIND_ICONS.thinking;
  const isCommand = row.entry._tag === "command";
  const { expandable } = useJournalOutput(row.entry);

  return (
    <TooltipContent className="max-w-sm">
      <span className="flex flex-col gap-1.5">
        <span className="flex items-center gap-1.5 text-xs opacity-70">
          <Glyph aria-hidden="true" size={13} />
          {KIND_NAMES[kind]}
          {row._tag === "bar" ? ` · ${seconds(row.durationMs)}` : ""}
        </span>

        {isCommand ? (
          <ShellBlock
            className="max-h-32 text-[11px] leading-[1.45]"
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
            {isCommand ? "Click to open what it printed" : "Click to open it"}
          </span>
        ) : null}
      </span>
    </TooltipContent>
  );
}

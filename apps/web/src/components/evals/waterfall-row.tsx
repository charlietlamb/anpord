import type { EvalJournalEntry } from "@anpord/schema/domain/evals";
import { Tooltip, TooltipTrigger } from "@anpord/ui/components/tooltip";
import { cn } from "@anpord/ui/lib/utils";
import { ExitCode } from "@/components/evals/exit-code";
import {
  JournalOutput,
  useJournalOutput,
} from "@/components/evals/journal-output";
import { RowTooltip } from "@/components/evals/waterfall-tooltip";
import { Track } from "@/components/evals/waterfall-track";
import {
  describeRow,
  KIND_COLOURS,
  labelOf,
} from "@/lib/evals/journal-presentation";
import type { WaterfallRow } from "@/lib/evals/waterfall-layout";

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

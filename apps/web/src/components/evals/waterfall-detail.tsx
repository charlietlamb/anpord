import { Button } from "@anpord/ui/components/button";
import { ShellBlock } from "@anpord/ui/components/ui/shell-block";
import { XIcon } from "@phosphor-icons/react";
import { ExitCode } from "@/components/evals/exit-code";
import { JournalOutput } from "@/components/evals/journal-output";
import { seconds } from "@/lib/evals/duration";
import {
  KIND_ICONS,
  KIND_NAMES,
  kindOf,
  labelOf,
  readableOf,
} from "@/lib/evals/journal-presentation";
import type { WaterfallRow } from "@/lib/evals/waterfall-layout";

/* The output belongs beside the chart rather than inside it: opening a step
   used to push every row below it down, so the timeline moved under the
   cursor that was reading it. */
export function WaterfallDetail({
  onClose,
  row,
}: {
  readonly onClose: () => void;
  readonly row: WaterfallRow;
}) {
  const kind = kindOf(row);
  const Glyph = KIND_ICONS[kind];
  const isCommand = row.entry._tag === "command";
  const output = readableOf(row.entry);

  return (
    <aside className="flex min-h-0 flex-col gap-3 rounded-lg border bg-card p-3">
      <header className="flex items-start gap-2">
        <Glyph aria-hidden="true" className="mt-0.5 shrink-0" size={13} />

        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex items-center gap-2 text-muted-foreground text-xs">
            {KIND_NAMES[kind]}
            {row._tag === "bar" ? <span>{seconds(row.durationMs)}</span> : null}
            {isCommand ? <ExitCode code={row.entry.exitCode} /> : null}
          </span>

          {isCommand ? (
            <ShellBlock command={labelOf(row.entry)} copyable={true} />
          ) : (
            <span className="text-pretty text-xs">{labelOf(row.entry)}</span>
          )}
        </span>

        <Button
          aria-label="Close"
          onClick={onClose}
          size="icon-sm"
          variant="ghost"
        >
          <XIcon size={13} />
        </Button>
      </header>

      {output === "" ? null : (
        <JournalOutput className="min-h-0 flex-1" output={output} />
      )}
    </aside>
  );
}

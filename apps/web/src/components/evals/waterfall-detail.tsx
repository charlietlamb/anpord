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

/* Beside the chart, not inside it: opening a step moved the timeline. */
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
    <aside className="flex min-h-0 flex-col gap-2 rounded-md border bg-card p-2.5">
      <header className="flex items-center gap-2 text-muted-foreground text-xs">
        <Glyph aria-hidden="true" className="shrink-0" size={13} />
        {KIND_NAMES[kind]}
        {row._tag === "bar" ? <span>{seconds(row.durationMs)}</span> : null}
        {isCommand ? <ExitCode code={row.entry.exitCode} /> : null}

        <Button
          aria-label="Close"
          className="ml-auto"
          onClick={onClose}
          size="icon-sm"
          variant="ghost"
        >
          <XIcon size={13} />
        </Button>
      </header>

      {isCommand ? (
        <ShellBlock
          className="text-[11px] leading-[1.45]"
          command={labelOf(row.entry)}
          copyable={true}
        />
      ) : (
        <span className="text-pretty text-xs">{labelOf(row.entry)}</span>
      )}

      {output === "" ? null : (
        <JournalOutput
          className="max-h-72 min-h-0 flex-1 text-[11px] leading-[1.45]"
          output={output}
        />
      )}
    </aside>
  );
}

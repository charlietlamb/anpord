import { labelOf } from "@anpord/schema/domain/eval-journal";
import type { EvalJournalEntry } from "@anpord/schema/domain/evals";
import { cn } from "@anpord/ui/lib/utils";
import { ExitCode } from "@/components/evals/exit-code";
import {
  JournalOutput,
  useJournalOutput,
} from "@/components/evals/journal-output";
import { KIND_COLOURS } from "@/lib/evals/journal-presentation";

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

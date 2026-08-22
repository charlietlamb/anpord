import type { EvalJournalEntry } from "@anpord/schema/domain/evals";
import { CodeBlock } from "@anpord/ui/components/ui/code-block";
import { cn } from "@anpord/ui/lib/utils";
import { useState } from "react";

const TRUNCATED_AT = 4000;

/**
 * Whether an entry has output worth opening, and whether it is open.
 *
 * Shared because the timed and untimed rows are the same disclosure with
 * different triggers: both held the same state, the same handler and the same
 * truncation block, and only their markup differed.
 */
export function useJournalOutput(entry: EvalJournalEntry) {
  const [open, setOpen] = useState(false);
  const output = entry._tag === "command" ? entry.output : "";
  const expandable = output !== "";

  return {
    expandable,
    open: open && expandable,
    output,
    toggle: expandable ? () => setOpen((was) => !was) : undefined,
  };
}

/** What a command wrote, and whether the sandbox stopped recording it. */
export function JournalOutput({
  className,
  output,
}: {
  readonly className?: string;
  readonly output: string;
}) {
  return (
    <CodeBlock
      className={cn("text-muted-foreground", className)}
      copyValue={output}
    >
      {output}
      {output.length >= TRUNCATED_AT ? (
        <span className="text-warning"> [truncated]</span>
      ) : null}
    </CodeBlock>
  );
}

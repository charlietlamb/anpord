import type { EvalJournalEntry } from "@anpord/schema/domain/evals";
import { CodeBlock } from "@anpord/ui/components/ui/code-block";
import { cn } from "@anpord/ui/lib/utils";
import { useState } from "react";

const TRUNCATED_AT = 4000;

const readableOf = (entry: EvalJournalEntry) => {
  if (entry._tag === "command") {
    return entry.output;
  }

  return entry._tag === "message" ? entry.text : "";
};

export function useJournalOutput(entry: EvalJournalEntry) {
  const output = readableOf(entry);
  const expandable = output !== "";
  const [open, setOpen] = useState(false);

  return {
    expandable,
    open: open && expandable,
    output,
    toggle: expandable ? () => setOpen((was) => !was) : undefined,
  };
}

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

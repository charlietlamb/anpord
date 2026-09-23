import { entryKindOf, labelOf } from "@anpord/schema/domain/eval-journal";
import type { EvalJournalEntry } from "@anpord/schema/domain/evals";
import { ShellText } from "@anpord/ui/components/ui/shell-text";
import { cn } from "@anpord/ui/lib/utils";
import { CallName } from "@/components/evals/call-name";
import { ExitCode } from "@/components/evals/exit-code";
import { KindIcon } from "@/components/evals/kind-icon";
import { stepFailed } from "@/lib/evals/conversation";

const MARKUP = /[*`#>]+/g;

export function StepLabel({ entry }: { readonly entry: EvalJournalEntry }) {
  const kind = entryKindOf(entry);
  const failed = entry._tag !== "message" && stepFailed(entry);

  return (
    <>
      <KindIcon failed={failed} kind={kind} />

      {entry._tag === "command" ? (
        <ShellText
          className="min-w-0 flex-1 truncate font-medium font-mono text-xs leading-none"
          command={labelOf(entry)}
        />
      ) : (
        <span
          className={cn(
            "min-w-0 flex-1 truncate font-medium text-label leading-none",
            kind === "said" ? "text-foreground" : "text-foreground/80"
          )}
        >
          {entry._tag === "toolCall" ? (
            <CallName name={entry.name} />
          ) : (
            labelOf(entry).replace(MARKUP, "")
          )}
        </span>
      )}

      {entry._tag === "command" ? <ExitCode code={entry.exitCode} /> : null}
    </>
  );
}

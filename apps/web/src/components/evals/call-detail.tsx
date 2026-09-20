import { Button } from "@anpord/ui/components/button";
import { ShellBlock } from "@anpord/ui/components/ui/shell-block";
import { XIcon } from "@phosphor-icons/react";
import { type Call, commandText, didFail } from "@/components/evals/call-row";
import { EvidenceValue } from "@/components/evals/evidence-value";
import { JournalOutput } from "@/components/evals/journal-output";

/* Beside the list rather than inside it: a row that grew in place pushed every
   call below it down the page. */
export function CallDetail({
  call,
  onClose,
  ordinal,
}: {
  readonly call: Call;
  readonly onClose: () => void;
  readonly ordinal: number;
}) {
  const command = call._tag === "command";
  const failed = didFail(call);

  return (
    <aside className="flex min-h-0 flex-col gap-2 rounded-md border bg-card p-2.5">
      <header className="flex items-center gap-2 text-muted-foreground text-xs">
        <span className="tabular-nums">Call {ordinal}</span>

        {command && call.exitCode !== null ? (
          <span className={failed ? "text-warning" : undefined}>
            exit {call.exitCode}
          </span>
        ) : null}

        {command ? null : <span>{call.status ?? "no status"}</span>}

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

      {command ? (
        <ShellBlock
          className="text-[11px] leading-[1.45]"
          command={commandText(call.command)}
          copyable={true}
        />
      ) : (
        <p className="font-mono text-[11px] text-foreground">{call.name}</p>
      )}

      {/* Output is what a terminal printed, so it keeps its own lines. */}
      {call.output === undefined || call.output === "" ? null : (
        <JournalOutput
          className="max-h-72 min-h-0 flex-1 text-[11px] leading-[1.45]"
          output={call.output}
        />
      )}

      {command ? null : (
        <dl className="min-w-0">
          {call.error === undefined ? null : (
            <EvidenceValue
              label="Error"
              truncated={call.errorTruncated}
              value={call.error}
            />
          )}

          <EvidenceValue
            disclosure
            label="Input"
            truncated={call.inputTruncated}
            value={call.input}
          />
        </dl>
      )}
    </aside>
  );
}

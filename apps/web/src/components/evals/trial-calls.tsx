import type { EvalJournalEntry } from "@anpord/schema/domain/evals";
import { ShellText } from "@anpord/ui/components/ui/shell-text";
import { cn } from "@anpord/ui/lib/utils";
import { PlugsConnectedIcon } from "@phosphor-icons/react";
import { EvidenceValue } from "./evidence-value";

type Call = Extract<EvalJournalEntry, { _tag: "command" | "toolCall" }>;

const SHELL_PREFIX = /^\/bin\/(?:ba)?sh -lc ['"]?/;
const TRAILING_QUOTE = /['"]$/;
const COMMAND_CHAIN = /\s*(?:&&|\|\||;)\s+/;

const commandLabel = (command: string) => {
  const unwrapped = command
    .replace(SHELL_PREFIX, "")
    .replace(TRAILING_QUOTE, "")
    .replace(/\s+/g, " ")
    .trim();
  const parts = unwrapped.split(COMMAND_CHAIN);
  const summary = parts[0] ?? unwrapped;
  const suffix = parts.length > 1 ? ` · +${parts.length - 1} more` : "";
  const available = Math.max(24, 52 - suffix.length);
  return `${summary.length > available ? `${summary.slice(0, available - 1)}…` : summary}${suffix}`;
};

const didFail = (call: Call) =>
  call._tag === "command"
    ? call.exitCode !== null && call.exitCode !== 0
    : call.error !== undefined ||
      call.status === "failed" ||
      call.status === "error";

const callStatus = (call: Call) => {
  if (call._tag === "command") {
    return call.exitCode === null
      ? "Exit not recorded"
      : `Exit ${call.exitCode}`;
  }
  return call.status ?? "Status not recorded";
};

/* A tool arrives as `server.tool`. The server repeats down the whole list, so
   it recedes and the tool -- the one part that differs row to row -- carries
   the weight the eye is scanning for. */
function CallName({ name }: { readonly name: string }) {
  const split = name.lastIndexOf(".");

  if (split <= 0) {
    return <span className="text-foreground">{name}</span>;
  }

  return (
    <>
      <span className="text-muted-foreground">{name.slice(0, split + 1)}</span>
      <span className="font-medium text-foreground">
        {name.slice(split + 1)}
      </span>
    </>
  );
}

function CallRow({
  call,
  ordinal,
}: {
  readonly call: Call;
  readonly ordinal: number;
}) {
  const command = call._tag === "command";
  const failed = didFail(call);

  return (
    <details className="group/call" open={ordinal === 1}>
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md px-3 py-2 text-xs transition-colors hover:bg-muted/40 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
        <span className="text-muted-foreground tabular-nums">{ordinal}</span>
        <span
          className="min-w-0 flex-1 truncate font-mono text-label"
          title={command ? call.command : call.name}
        >
          {command ? (
            <ShellText command={commandLabel(call.command)} />
          ) : (
            <CallName name={call.name} />
          )}
        </span>
        <span
          className={cn(
            "shrink-0 rounded-md px-1.5 py-0.5 text-muted-foreground",
            failed && "bg-warning/10 text-warning"
          )}
        >
          {callStatus(call)}
        </span>
        <span
          aria-hidden="true"
          className="text-muted-foreground transition-transform group-open/call:rotate-90"
        >
          ›
        </span>
      </summary>
      <div className="space-y-2 px-3.5 pb-3">
        <dl>
          <EvidenceValue
            label="Output"
            truncated={call.outputTruncated}
            value={call.output}
          />
          {!command && call.error !== undefined ? (
            <EvidenceValue
              label="Error"
              truncated={call.errorTruncated}
              value={call.error}
            />
          ) : null}
        </dl>
        <EvidenceValue
          disclosure
          label="Input"
          truncated={command ? false : call.inputTruncated}
          value={command ? call.command : call.input}
        />
      </div>
    </details>
  );
}

export function TrialCalls({
  trajectory,
}: {
  readonly trajectory: readonly EvalJournalEntry[];
}) {
  const calls = trajectory
    .filter(
      (entry): entry is Call =>
        entry._tag === "command" || entry._tag === "toolCall"
    )
    .map((call, index) => ({ call, ordinal: index + 1 }));
  if (calls.length === 0) {
    return null;
  }

  const failed = calls.filter(({ call }) => didFail(call)).length;

  /* Closed by default. What an agent ran is evidence for a verdict rather than
     the verdict itself, and a trial with ten commands would otherwise open on
     a page of shell rather than on whether it passed. */
  return (
    <details className="group/calls">
      <summary className="flex cursor-pointer list-none items-center gap-2 py-2 text-muted-foreground text-xs hover:text-foreground focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
        <PlugsConnectedIcon aria-hidden="true" className="size-3.5 shrink-0" />
        <h3>
          {calls.length} {calls.length === 1 ? "call" : "calls"}
        </h3>
        {failed ? <span className="text-warning">{failed} failed</span> : null}
        <span
          aria-hidden="true"
          className="transition-transform group-open/calls:rotate-90"
        >
          ›
        </span>
      </summary>

      <div className="space-y-1 pt-1">
        {calls.map(({ call, ordinal }) => (
          <CallRow call={call} key={ordinal} ordinal={ordinal} />
        ))}
      </div>
    </details>
  );
}

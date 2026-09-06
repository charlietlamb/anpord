import type { EvalJournalEntry } from "@anpord/schema/domain/evals";
import { CodeBlock } from "@anpord/ui/components/ui/code-block";
import { cn } from "@anpord/ui/lib/utils";
import { PlugsConnectedIcon } from "@phosphor-icons/react";
import { SetupSurface } from "./setup-surface";

type Call = Extract<EvalJournalEntry, { _tag: "command" | "toolCall" }>;

const callStatus = (call: Call) => {
  if (call._tag === "command") {
    return call.exitCode === null
      ? "Exit not recorded"
      : `Exit ${call.exitCode}`;
  }
  return call.status ?? "Status not recorded";
};

const formatValue = (value: string) => {
  try {
    const parsed: unknown = JSON.parse(value);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return value;
  }
};

function CallValue({
  label,
  value,
  truncated,
}: {
  readonly label: string;
  readonly value: string | undefined;
  readonly truncated?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="px-3.5 pt-2 text-muted-foreground text-xs">{label}</dt>
      <dd>
        {value === undefined ? (
          <p className="px-3.5 py-2.5 text-muted-foreground text-xs">
            Not recorded
          </p>
        ) : (
          <CodeBlock copyValue={value} tone="plain">
            {value === "" ? "(empty)" : formatValue(value)}
          </CodeBlock>
        )}
        {truncated ? (
          <p className="px-3.5 pb-2 text-warning text-xs">Truncated</p>
        ) : null}
      </dd>
    </div>
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
  const failed = command
    ? call.exitCode !== null && call.exitCode !== 0
    : call.error !== undefined ||
      call.status === "failed" ||
      call.status === "error";

  return (
    <details className="group/call" open={ordinal === 1}>
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3.5 py-2.5 text-xs hover:bg-muted/40 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
        <span className="text-muted-foreground tabular-nums">{ordinal}</span>
        <span className="min-w-0 flex-1 truncate font-mono">
          {command ? call.command : call.name}
        </span>
        <span
          className={cn(
            "shrink-0 text-muted-foreground",
            failed && "text-warning"
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
      <dl className="grid border-border-faint border-t pb-2 md:grid-cols-2 md:divide-x md:divide-border-faint">
        <CallValue
          label="Input"
          truncated={command ? false : call.inputTruncated}
          value={command ? call.command : call.input}
        />
        <CallValue
          label="Output"
          truncated={call.outputTruncated}
          value={call.output}
        />
        {!command && call.error !== undefined ? (
          <div className="border-border-faint border-t md:col-span-2">
            <CallValue
              label="Error"
              truncated={call.errorTruncated}
              value={call.error}
            />
          </div>
        ) : null}
      </dl>
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
  return (
    <SetupSurface
      contentClassName="divide-y divide-border-faint p-0"
      Icon={PlugsConnectedIcon}
      meta={String(calls.length)}
      title="Calls"
    >
      {calls.map(({ call, ordinal }) => (
        <CallRow call={call} key={ordinal} ordinal={ordinal} />
      ))}
    </SetupSurface>
  );
}

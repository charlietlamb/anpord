import type { EvalJournalEntry } from "@anpord/schema/domain/evals";
import { PlugsConnectedIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { CallDetail } from "@/components/evals/call-detail";
import { type Call, CallRow, didFail } from "@/components/evals/call-row";

export function TrialCalls({
  trajectory,
}: {
  readonly trajectory: readonly EvalJournalEntry[];
}) {
  const [selected, setSelected] = useState<number | null>(null);

  const calls = trajectory
    .filter(
      (entry): entry is Call =>
        entry._tag === "command" || entry._tag === "toolCall"
    )
    .map((call, index) => ({ call, ordinal: index + 1 }));

  if (calls.length === 0) {
    return null;
  }

  const failed = calls.filter((entry) => didFail(entry.call)).length;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-6 items-center gap-2 text-muted-foreground text-xs">
        <PlugsConnectedIcon aria-hidden="true" className="size-3.5 shrink-0" />
        <h3>
          {calls.length} {calls.length === 1 ? "call" : "calls"}
        </h3>
        {failed ? <span className="text-warning">{failed} failed</span> : null}
      </div>

      <ol className="flex flex-col gap-0.5">
        {calls.map(({ call, ordinal }) => (
          <CallRow
            call={call}
            key={ordinal}
            onSelect={() => setSelected(selected === ordinal ? null : ordinal)}
            ordinal={ordinal}
            selected={selected === ordinal}
          >
            {selected === ordinal ? (
              <CallDetail
                call={call}
                onClose={() => setSelected(null)}
                ordinal={ordinal}
              />
            ) : null}
          </CallRow>
        ))}
      </ol>
    </div>
  );
}

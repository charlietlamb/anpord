import { entryKindOf } from "@anpord/schema/domain/eval-journal";
import { CallName } from "@/components/evals/call-name";
import { KindIcon } from "@/components/evals/kind-icon";
import { StepDetailBody } from "@/components/evals/step-detail-body";
import { StepTiming } from "@/components/evals/step-timing";
import { failureLabel } from "@/lib/evals/conversation";
import { seconds } from "@/lib/evals/duration";
import { KIND_NAMES } from "@/lib/evals/journal-presentation";
import type { SelectedStep } from "@/lib/evals/selected-step";

export function StepDetail({
  step: { entry, row },
}: {
  readonly step: SelectedStep;
}) {
  const kind = entryKindOf(entry);
  const failure = entry._tag === "message" ? null : failureLabel(entry);
  const lead = row?.lead ?? null;

  return (
    <div className="flex min-h-0 min-w-0 flex-col gap-4">
      <header className="flex h-7 shrink-0 items-center gap-2">
        <KindIcon failed={failure !== null} kind={kind} />
        <h3 className="min-w-0 truncate font-medium text-sm">
          {entry._tag === "toolCall" ? (
            <CallName name={entry.name} />
          ) : (
            KIND_NAMES[kind]
          )}
        </h3>
        {failure === null ? null : (
          <span className="font-medium text-sm text-warning">{failure}</span>
        )}
      </header>

      {lead !== null || row?._tag === "bar" ? (
        <dl className="flex flex-col gap-1.5">
          {lead === null ? null : (
            <StepTiming label="Thinking" value={seconds(lead.durationMs)} />
          )}
          {row?._tag === "bar" ? (
            <StepTiming label="Ran" value={seconds(row.durationMs)} />
          ) : null}
        </dl>
      ) : null}

      <StepDetailBody entry={entry} />
    </div>
  );
}

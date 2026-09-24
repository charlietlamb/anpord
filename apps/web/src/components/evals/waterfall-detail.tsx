import { entryKindOf, labelOf } from "@anpord/schema/domain/eval-journal";
import type { EvalJournalEntry } from "@anpord/schema/domain/evals";
import {
  ToolInput,
  ToolOutput,
  ToolSection,
} from "@anpord/ui/components/ai-elements/tool";
import { ShellText } from "@anpord/ui/components/ui/shell-text";
import { CallName } from "@/components/evals/call-name";
import { KindIcon } from "@/components/evals/kind-icon";
import { MarkdownProse } from "@/components/evals/markdown-prose";
import { failureLabel } from "@/lib/evals/conversation";
import { seconds } from "@/lib/evals/duration";
import { KIND_NAMES } from "@/lib/evals/journal-presentation";
import type { SelectedStep } from "@/lib/evals/selected-step";

function DetailBody({ entry }: { readonly entry: EvalJournalEntry }) {
  if (entry._tag === "message") {
    return <MarkdownProse text={entry.text} />;
  }

  if (entry._tag === "command") {
    const command = labelOf(entry);

    return (
      <>
        <ToolSection copy={command} label="Command">
          <ShellText command={command} />
        </ToolSection>
        <ToolOutput output={entry.output} truncated={entry.outputTruncated} />
      </>
    );
  }

  if (entry._tag === "toolCall") {
    return (
      <>
        <ToolInput input={entry.input} truncated={entry.inputTruncated} />
        <ToolOutput
          errorText={entry.error}
          output={entry.output}
          truncated={entry.outputTruncated}
        />
      </>
    );
  }

  return (
    <ToolSection copy={entry.paths.join("\n")} label="Files">
      {entry.paths.join("\n")}
    </ToolSection>
  );
}

function Timing({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-label">
      <dt className="font-medium text-foreground">{label}</dt>
      <dd className="text-muted-foreground tabular-nums">{value}</dd>
    </div>
  );
}

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
            <Timing label="Thinking" value={seconds(lead.durationMs)} />
          )}
          {row?._tag === "bar" ? (
            <Timing label="Ran" value={seconds(row.durationMs)} />
          ) : null}
        </dl>
      ) : null}

      <DetailBody entry={entry} />
    </div>
  );
}

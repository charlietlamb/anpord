import { labelOf } from "@anpord/schema/domain/eval-journal";
import type { EvalJournalEntry } from "@anpord/schema/domain/evals";
import {
  ToolInput,
  ToolOutput,
  ToolSection,
} from "@anpord/ui/components/ai-elements/tool";
import { ShellText } from "@anpord/ui/components/ui/shell-text";
import { MarkdownProse } from "@/components/evals/markdown-prose";

export function StepDetailBody({
  entry,
}: {
  readonly entry: EvalJournalEntry;
}) {
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

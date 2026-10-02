import { labelOf } from "@sphynx/schema/domain/eval-journal";
import type { EvalJournalEntry } from "@sphynx/schema/domain/eval-trial";
import {
  ToolInput,
  ToolOutput,
  ToolSection,
} from "@sphynx/ui/components/ai-elements/tool";
import { ShellText } from "@sphynx/ui/components/ui/shell-text";
import { MarkdownProse } from "@/components/evals/markdown-prose";

export type StepPart = "all" | "input" | "output";

export function StepDetailBody({
  entry,
  part = "all",
}: {
  readonly entry: EvalJournalEntry;
  readonly part?: StepPart;
}) {
  if (entry._tag === "message") {
    return <MarkdownProse text={entry.text} />;
  }

  if (entry._tag === "fileChange") {
    return (
      <ToolSection copy={entry.paths.join("\n")} label="Files">
        {entry.paths.join("\n")}
      </ToolSection>
    );
  }

  const input =
    entry._tag === "command" ? (
      <ToolSection copy={labelOf(entry)} label="Command">
        <ShellText command={labelOf(entry)} />
      </ToolSection>
    ) : (
      <ToolInput input={entry.input} truncated={entry.inputTruncated} />
    );
  const output = (
    <ToolOutput
      errorText={entry._tag === "toolCall" ? entry.error : undefined}
      output={entry.output}
      truncated={entry.outputTruncated}
    />
  );

  return (
    <>
      {part === "output" ? null : input}
      {part === "input" ? null : output}
    </>
  );
}

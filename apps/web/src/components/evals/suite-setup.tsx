import type { EvalSuiteSetup } from "@anpord/schema/domain/evals";
import { DetailList, DetailRow } from "@anpord/ui/components/ui/detail-list";
import { EmptyValue } from "@/components/evals/empty-value";
import { PromptValue } from "@/components/evals/prompt-value";
import { WorkspaceValue } from "@/components/evals/workspace-value";

export function SuiteSetup({ setup }: { readonly setup: EvalSuiteSetup }) {
  return (
    <DetailList label="Setup">
      <DetailRow
        description="Each case fills this in with its own variables."
        label="Prompt"
      >
        <PromptValue prompt={setup.prompt} />
      </DetailRow>

      <DetailRow
        description="Where the agent starts, unless a case names its own."
        label="Workspace"
      >
        {setup.source === null ? (
          <EmptyValue>Not recorded</EmptyValue>
        ) : (
          <WorkspaceValue workspace={setup.source} />
        )}
      </DetailRow>
    </DetailList>
  );
}

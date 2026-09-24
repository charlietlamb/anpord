import type { EvalSetup } from "@anpord/schema/domain/evals";
import { DetailList, DetailRow } from "@anpord/ui/components/ui/detail-list";
import { InlineCode } from "@anpord/ui/components/ui/inline-code";
import { ChecksValue } from "@/components/evals/checks-value";
import { EmptyValue } from "@/components/evals/empty-value";
import { WorkspaceValue } from "@/components/evals/workspace-value";

export function CaseSetup({ setup }: { readonly setup: EvalSetup }) {
  return (
    <DetailList bare label="Setup">
      <DetailRow label="Prompt">
        <p className="max-h-40 overflow-y-auto whitespace-pre-wrap leading-relaxed">
          {setup.prompt}
        </p>
      </DetailRow>

      <DetailRow label="Workspace">
        <WorkspaceValue workspace={setup.source} />
      </DetailRow>

      <DetailRow label="Prepare">
        {setup.prepare === null ? (
          <EmptyValue>None</EmptyValue>
        ) : (
          <InlineCode>{setup.prepare}</InlineCode>
        )}
      </DetailRow>

      <DetailRow label="Checks">
        <ChecksValue setup={setup} />
      </DetailRow>
    </DetailList>
  );
}

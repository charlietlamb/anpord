import type { EvalSetup } from "@anpord/schema/domain/evals";
import { DetailList, DetailRow } from "@anpord/ui/components/ui/detail-list";
import { InlineCode } from "@anpord/ui/components/ui/inline-code";
import { EmptyValue } from "@/components/evals/empty-value";

const workspaceOf = (setup: EvalSetup) => {
  if (setup.repoUrl === null) {
    return setup.workspace;
  }

  return setup.repoRef === null
    ? setup.repoUrl
    : `${setup.repoUrl}@${setup.repoRef}`;
};

export function TrialSetup({ setup }: { readonly setup: EvalSetup }) {
  const check = setup.verifyCommand ?? setup.validatorName;

  return (
    <DetailList bare label="Setup">
      <DetailRow label="Prompt">
        <p className="max-h-40 overflow-y-auto whitespace-pre-wrap leading-relaxed">
          {setup.prompt}
        </p>
      </DetailRow>

      <DetailRow label="Workspace">
        <InlineCode>{workspaceOf(setup)}</InlineCode>
      </DetailRow>

      <DetailRow label="Prepare">
        {setup.prepareName === null ? (
          <EmptyValue>None</EmptyValue>
        ) : (
          <InlineCode>{setup.prepareName}</InlineCode>
        )}
      </DetailRow>

      <DetailRow label="Checks">
        {check === null ? (
          <EmptyValue>Nothing checks this case</EmptyValue>
        ) : (
          <InlineCode>{check}</InlineCode>
        )}
      </DetailRow>
    </DetailList>
  );
}

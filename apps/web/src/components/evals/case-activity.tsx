import type { EvalCaseDetail } from "@anpord/schema/domain/evals";
import { CaseReadings } from "@/components/evals/case-readings";
import { useCaseActivity } from "@/lib/evals/use-case-activity";
import { useSelectedVariant } from "@/lib/evals/use-selected-variant";

export function CaseActivity({ detail }: { readonly detail: EvalCaseDetail }) {
  const { selected } = useSelectedVariant(detail.variants);

  return (
    <CaseReadings
      caseId={detail.id}
      entries={useCaseActivity(detail, selected?.cellKey ?? null)}
      versions={detail.versions}
    />
  );
}

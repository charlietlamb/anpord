import type { EvalCaseDetail } from "@anpord/schema/domain/evals";
import { SkeletonScope } from "@anpord/ui/components/ui/skeleton-scope";
import { CaseRuns } from "@/components/evals/case-runs";
import { PLACEHOLDER_RUN_PAGE } from "@/lib/evals/eval-placeholders";
import { useCaseRuns } from "@/lib/evals/use-case-runs";
import { useSelectedVariant } from "@/lib/evals/use-selected-variant";

export function CaseActivity({ detail }: { readonly detail: EvalCaseDetail }) {
  const { selected } = useSelectedVariant(detail.variants);
  const { onPage, paging, runs } = useCaseRuns(
    detail.id,
    selected?.variant.id ?? null
  );

  return (
    <SkeletonScope loading={runs === undefined}>
      <CaseRuns
        caseId={detail.id}
        onPage={onPage}
        page={runs ?? PLACEHOLDER_RUN_PAGE}
        paging={paging}
      />
    </SkeletonScope>
  );
}

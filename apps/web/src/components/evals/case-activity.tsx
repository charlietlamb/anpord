import type { EvalCaseDetail } from "@anpord/schema/domain/evals";
import { DataTableSkeleton } from "@anpord/ui/components/ui/data-table";
import { CaseRuns } from "@/components/evals/case-runs";
import { CASE_RUNS_TABLE } from "@/lib/evals/case-tables";
import { useCaseRuns } from "@/lib/evals/use-case-runs";
import { useSelectedVariant } from "@/lib/evals/use-selected-variant";

export function CaseActivity({ detail }: { readonly detail: EvalCaseDetail }) {
  const { selected } = useSelectedVariant(detail.variants);
  const { onPage, paging, runs } = useCaseRuns(
    detail.id,
    selected?.variant.id ?? null
  );

  if (runs === undefined) {
    return <DataTableSkeleton {...CASE_RUNS_TABLE} />;
  }

  return (
    <CaseRuns caseId={detail.id} onPage={onPage} page={runs} paging={paging} />
  );
}

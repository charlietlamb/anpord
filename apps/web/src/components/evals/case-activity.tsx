import type { EvalCaseDetail } from "@anpord/schema/domain/evals";
import { DataTableSkeleton } from "@anpord/ui/components/ui/data-table";
import { CaseReadings } from "@/components/evals/case-readings";
import { CASE_HISTORY_TABLE } from "@/lib/evals/case-tables";
import { useCaseHistory } from "@/lib/evals/use-case-history";
import { useSelectedVariant } from "@/lib/evals/use-selected-variant";

export function CaseActivity({ detail }: { readonly detail: EvalCaseDetail }) {
  const { selected } = useSelectedVariant(detail.variants);
  const { history, onPage, paging } = useCaseHistory(
    detail.id,
    selected?.cellKey ?? null
  );

  if (history === undefined) {
    return <DataTableSkeleton {...CASE_HISTORY_TABLE} />;
  }

  return (
    <CaseReadings
      caseId={detail.id}
      history={history}
      onPage={onPage}
      paging={paging}
    />
  );
}

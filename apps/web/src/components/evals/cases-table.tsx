import type { EvalCaseSummary } from "@anpord/schema/domain/eval-read-models";
import type { ReactNode } from "react";
import { CaseListRow } from "@/components/evals/case-list-row";
import { SummaryTable } from "@/components/evals/summary-table";
import { CASES_TABLE } from "@/lib/evals/case-tables";

export function CasesTable({
  cases,
  pagination,
}: {
  readonly cases: readonly EvalCaseSummary[];
  readonly pagination: ReactNode;
}) {
  return (
    <SummaryTable
      items={cases}
      pagination={pagination}
      row={(subject) => <CaseListRow key={subject.id} subject={subject} />}
      table={CASES_TABLE}
    />
  );
}

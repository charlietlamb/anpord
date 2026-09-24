import type { EvalCaseSummary } from "@anpord/schema/domain/evals";
import {
  DataTable,
  DataTableBody,
  DataTableFooter,
  DataTableHead,
} from "@anpord/ui/components/ui/data-table";
import type { ReactNode } from "react";
import { CaseListRow } from "@/components/evals/case-list-row";
import { CASES_TABLE } from "@/lib/evals/case-tables";
import { counted } from "@/lib/evals/conversation";

export function CasesTable({
  cases,
  pagination,
}: {
  readonly cases: readonly EvalCaseSummary[];
  readonly pagination: ReactNode;
}) {
  return (
    <DataTable columns={CASES_TABLE.columns} label={CASES_TABLE.label}>
      <DataTableHead headings={CASES_TABLE.headings} />
      <DataTableBody>
        {cases.map((subject) => (
          <CaseListRow key={subject.id} subject={subject} />
        ))}
      </DataTableBody>
      <DataTableFooter actions={pagination}>
        Showing {counted(cases.length, "case", "cases")}
      </DataTableFooter>
    </DataTable>
  );
}

import type { EvalSuiteSummary } from "@anpord/schema/domain/evals";
import {
  DataTable,
  DataTableBody,
  DataTableFooter,
  DataTableHead,
} from "@anpord/ui/components/ui/data-table";
import type { ReactNode } from "react";
import { SuiteListRow } from "@/components/evals/suite-list-row";
import { SUITES_TABLE } from "@/lib/evals/case-tables";
import { counted } from "@/lib/evals/conversation";

export function SuitesTable({
  pagination,
  suites,
}: {
  readonly pagination: ReactNode;
  readonly suites: readonly EvalSuiteSummary[];
}) {
  return (
    <DataTable columns={SUITES_TABLE.columns} label={SUITES_TABLE.label}>
      <DataTableHead headings={SUITES_TABLE.headings} />
      <DataTableBody>
        {suites.map((suite) => (
          <SuiteListRow key={suite.id} suite={suite} />
        ))}
      </DataTableBody>
      <DataTableFooter actions={pagination}>
        Showing {counted(suites.length, "suite", "suites")}
      </DataTableFooter>
    </DataTable>
  );
}

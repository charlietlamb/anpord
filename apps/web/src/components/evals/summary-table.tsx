import {
  DataTable,
  DataTableBody,
  DataTableFooter,
  DataTableHead,
} from "@sphynx/ui/components/ui/data-table";
import { counted } from "@sphynx/ui/lib/evals/counted";
import type { ReactNode } from "react";

export function SummaryTable<T>({
  items,
  pagination,
  row,
  table,
}: {
  readonly items: readonly T[];
  readonly pagination: ReactNode;
  readonly row: (item: T) => ReactNode;
  readonly table: {
    readonly columns: string;
    readonly headings: readonly string[];
    readonly label: string;
    readonly noun: readonly [one: string, many: string];
  };
}) {
  return (
    <DataTable columns={table.columns} label={table.label}>
      <DataTableHead headings={table.headings} />
      <DataTableBody>{items.map(row)}</DataTableBody>
      <DataTableFooter actions={pagination}>
        Showing {counted(items.length, ...table.noun)}
      </DataTableFooter>
    </DataTable>
  );
}

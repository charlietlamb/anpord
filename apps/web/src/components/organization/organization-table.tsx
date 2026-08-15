import { DataTable } from "@anpord/ui/components/data-table/data-table";
import { useDataTable } from "@anpord/ui/components/data-table/use-data-table";
import type { ColumnDef } from "@tanstack/react-table";
import type { ReactNode } from "react";

interface OrganizationTableProps<T> {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  emptyState: ReactNode;
  isLoading?: boolean;
}

export function OrganizationTable<T>({
  data,
  columns,
  isLoading,
  emptyState,
}: OrganizationTableProps<T>) {
  const table = useDataTable({ data, columns });

  return (
    <DataTable.Provider
      config={{
        table,
        numberOfColumns: columns.length,
        isLoading,
        enableSorting: true,
        emptyState,
      }}
    >
      <DataTable.Container>
        <DataTable.Header />
        <DataTable.Body />
      </DataTable.Container>
    </DataTable.Provider>
  );
}

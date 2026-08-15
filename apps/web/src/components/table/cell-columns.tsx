import { Badge } from "@anpord/ui/components/ui/badge";
import { formatDate } from "@anpord/ui/lib/format-date";
import type { ColumnDef } from "@tanstack/react-table";
import type { ReactNode } from "react";

export function roleColumn<T>(
  accessor: keyof T & string,
  fallback?: string
): ColumnDef<T, unknown> {
  return {
    header: "Role",
    accessorKey: accessor,
    size: 120,
    cell: ({ row }) => (
      <Badge className="capitalize" variant="secondary">
        {String(row.original[accessor] ?? fallback ?? "")}
      </Badge>
    ),
  };
}

function mutedCell(value: ReactNode) {
  return <span className="text-muted-foreground tabular-nums">{value}</span>;
}

export function dateColumn<T>(
  header: string,
  accessor: keyof T & string,
  options: { never?: boolean; size?: number } = {}
): ColumnDef<T, unknown> {
  return {
    header,
    accessorKey: accessor,
    size: options.size ?? 140,
    cell: ({ row }) => {
      const value = row.original[accessor] as string | null;
      if (!value) {
        return mutedCell(options.never ? "Never" : "—");
      }
      return mutedCell(formatDate(value));
    },
  };
}

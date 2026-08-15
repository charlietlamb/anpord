import { Table } from "@anpord/ui/components/ui/table";
import { cn } from "@anpord/ui/lib/utils";
import type { ReactNode } from "react";

export function DataTableContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-auto rounded-lg border bg-card",
        className
      )}
    >
      <Table>{children}</Table>
    </div>
  );
}

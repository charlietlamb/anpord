import { DataTableRow } from "@anpord/ui/components/ui/data-table";
import { AgeCell } from "@/components/layout/age-cell";
import { DestructiveMenuItem } from "@/components/layout/destructive-menu-item";
import { RowActionsMenu } from "@/components/layout/row-actions-menu";

export function ApiKeyRow({
  createdAt,
  name,
  onRevoke,
  start,
}: {
  readonly createdAt: Date | string;
  readonly name: string;
  readonly onRevoke: () => void;
  readonly start: string | null;
}) {
  return (
    <DataTableRow>
      <span className="truncate text-foreground">{name}</span>
      <span className="truncate font-mono text-muted-foreground text-xs">
        {start ? `${start}…` : "—"}
      </span>
      <AgeCell at={new Date(createdAt).getTime()} />
      <RowActionsMenu label={`Actions for ${name}`}>
        <DestructiveMenuItem onClick={onRevoke}>Revoke</DestructiveMenuItem>
      </RowActionsMenu>
    </DataTableRow>
  );
}

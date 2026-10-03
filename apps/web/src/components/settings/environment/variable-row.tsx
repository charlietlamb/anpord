import type { EnvironmentVariable } from "@sphynx/schema/domain/environment";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@sphynx/ui/components/dropdown-menu";
import { DataTableRow } from "@sphynx/ui/components/ui/data-table";
import { cn } from "@sphynx/ui/lib/utils";
import { DestructiveMenuItem } from "@/components/layout/destructive-menu-item";
import { RowActionsMenu } from "@/components/layout/row-actions-menu";
import { LastUsedCell } from "@/components/settings/environment/last-used-cell";
import { UsedByBadges } from "@/components/settings/environment/used-by-badges";
import { scopeLabel } from "@/lib/settings/scopes";
import { usedBy } from "@/lib/settings/variable-uses";

export function VariableRow({
  onEdit,
  onRemove,
  variable,
}: {
  readonly onEdit: () => void;
  readonly onRemove: () => void;
  readonly variable: EnvironmentVariable;
}) {
  return (
    <DataTableRow>
      <span className="truncate font-mono text-foreground text-xs">
        {variable.name}
      </span>

      <UsedByBadges uses={usedBy(variable.name)} />

      <span
        className={cn(
          "truncate font-mono text-xs",
          variable.secret ? "text-muted-foreground" : "text-foreground"
        )}
      >
        {variable.preview}
      </span>

      <span className="truncate text-muted-foreground">
        {scopeLabel(variable.scope)}
      </span>

      <LastUsedCell at={variable.lastUsedAt} />

      <RowActionsMenu label={`Actions for ${variable.name}`}>
        <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DestructiveMenuItem onClick={onRemove}>Remove</DestructiveMenuItem>
      </RowActionsMenu>
    </DataTableRow>
  );
}

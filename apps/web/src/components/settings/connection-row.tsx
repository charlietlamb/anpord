import type {
  CredentialConnection,
  CredentialIntegration,
} from "@anpord/schema/domain/credentials";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@anpord/ui/components/dropdown-menu";
import { DataTableRow } from "@anpord/ui/components/ui/data-table";
import { StatusBadge } from "@anpord/ui/components/ui/status-badge";
import { CheckCircleIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { AgeCell } from "@/components/layout/age-cell";
import { DefaultBadge } from "@/components/layout/default-badge";
import { DestructiveMenuItem } from "@/components/layout/destructive-menu-item";
import { RowActionsMenu } from "@/components/layout/row-actions-menu";
import { integrationPresentation } from "@/lib/settings/integration-presentation";

export function ConnectionRow({
  connection,
  integration,
  onDefault,
  onRemove,
  onRotate,
  onVerify,
}: {
  readonly connection: CredentialConnection;
  readonly integration: CredentialIntegration;
  readonly onDefault: () => void;
  readonly onRemove: () => void;
  readonly onRotate?: () => void;
  readonly onVerify: () => void;
}) {
  const method = integration.authMethods.find(
    (candidate) => candidate.id === connection.authMethodId
  );
  const own = integrationPresentation(integration);

  return (
    <DataTableRow>
      <span className="flex min-w-0 items-center gap-2.5">
        <own.Icon className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate text-foreground">{connection.name}</span>
        {connection.isDefault ? <DefaultBadge /> : null}
      </span>

      <span className="truncate text-muted-foreground">
        {method?.label ?? "—"}
      </span>

      <span className="truncate text-muted-foreground">
        {connection.scope === "personal" ? "Only you" : "Organization"}
      </span>

      <span>
        {connection.status === "invalid" ? (
          <StatusBadge icon={WarningCircleIcon} size="xs" tone="destructive">
            Invalid
          </StatusBadge>
        ) : (
          <StatusBadge icon={CheckCircleIcon} size="xs" tone="positive">
            Active
          </StatusBadge>
        )}
      </span>

      {connection.lastUsedAt === null ? (
        <span className="text-muted-foreground">Never</span>
      ) : (
        <AgeCell at={connection.lastUsedAt.epochMillis} />
      )}

      <RowActionsMenu label={`Actions for ${connection.name}`}>
        <DropdownMenuItem onClick={onVerify}>Check it works</DropdownMenuItem>
        {onRotate ? (
          <DropdownMenuItem onClick={onRotate}>Rotate secret</DropdownMenuItem>
        ) : null}
        {connection.isDefault ? null : (
          <DropdownMenuItem onClick={onDefault}>Make default</DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DestructiveMenuItem onClick={onRemove}>Remove</DestructiveMenuItem>
      </RowActionsMenu>
    </DataTableRow>
  );
}

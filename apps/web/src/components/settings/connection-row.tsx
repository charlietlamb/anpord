import type {
  CredentialConnection,
  CredentialIntegration,
} from "@anpord/schema/domain/credentials";
import { Button } from "@anpord/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@anpord/ui/components/dropdown-menu";
import { StatusBadge } from "@anpord/ui/components/ui/status-badge";
import { DotsThreeIcon } from "@phosphor-icons/react";
import { DateTime } from "effect";
import { ListRow, RowTitle } from "@/components/layout/list-row";
import { ROW_ACTION } from "@/components/layout/row-action";
import { integrationPresentation } from "@/lib/settings/integration-presentation";
import { useRelativeTime } from "@/lib/use-relative-time";

/**
 * One stored credential, as a row.
 *
 * The same shape as every other list on the site: a mark, a name, a few
 * muted facts, the numbers on the right, and a menu that appears on approach.
 * The previous row stated seven facts in a sentence joined by dots, and said
 * "Active" on every healthy row -- the normal case is not news, so only an
 * invalid credential and a default one are badged.
 */
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
  const used = useRelativeTime(
    DateTime.toDateUtc(connection.lastUsedAt ?? connection.createdAt)
  );

  return (
    <ListRow
      actions={
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                aria-label={`Actions for ${connection.name}`}
                className={ROW_ACTION}
                size="icon-sm"
                variant="bare"
              />
            }
          >
            <DotsThreeIcon />
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onVerify}>
              Check it works
            </DropdownMenuItem>
            {onRotate ? (
              <DropdownMenuItem onClick={onRotate}>
                Rotate secret
              </DropdownMenuItem>
            ) : null}
            {connection.isDefault ? null : (
              <DropdownMenuItem onClick={onDefault}>
                Make default
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={onRemove}
            >
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
      leading={<own.Icon className="size-3.5 shrink-0 text-muted-foreground" />}
      meta={
        <span className="whitespace-nowrap">
          {connection.lastUsedAt === null ? "Never used" : `Used ${used}`}
        </span>
      }
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <RowTitle>{connection.name}</RowTitle>

        <span className="truncate text-muted-foreground/70 text-xs">
          {[
            connection.name === own.label ? null : own.label,
            method?.label ?? null,
            connection.scope === "personal" ? "Only you" : null,
          ]
            .filter((part) => part !== null)
            .join(" · ")}
        </span>

        {connection.isDefault ? (
          <StatusBadge size="xs">Default</StatusBadge>
        ) : null}
        {connection.status === "invalid" ? (
          <StatusBadge size="xs" tone="critical">
            Invalid
          </StatusBadge>
        ) : null}
      </span>
    </ListRow>
  );
}

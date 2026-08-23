import type {
  CredentialConnection,
  CredentialIntegration,
} from "@anpord/schema/domain/credentials";
import { Button } from "@anpord/ui/components/button";
import { StatusBadge } from "@anpord/ui/components/ui/status-badge";
import { DateTime } from "effect";
import {
  harnessPresentation,
  providerPresentation,
} from "@/lib/evals/variant-presentation";
import { useRelativeTime } from "@/lib/use-relative-time";

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
  const { Icon } =
    integration.category === "harness"
      ? harnessPresentation(integration.id)
      : providerPresentation(integration.id);
  const used = useRelativeTime(
    DateTime.toDateUtc(connection.lastUsedAt ?? connection.createdAt)
  );
  const checked = useRelativeTime(
    DateTime.toDateUtc(connection.lastVerifiedAt ?? connection.createdAt)
  );

  return (
    <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/50">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium text-sm">
              {connection.name}
            </span>
            <StatusBadge
              size="xs"
              tone={connection.status === "active" ? "positive" : "critical"}
            >
              {connection.status === "active" ? "Active" : "Invalid"}
            </StatusBadge>
            {connection.isDefault ? (
              <StatusBadge size="xs">Default</StatusBadge>
            ) : null}
          </div>
          <div className="truncate text-muted-foreground text-xs">
            {integration.label} · {method?.label ?? connection.authMethodId} ·{" "}
            {connection.scope === "organization" ? "Organization" : "Personal"}{" "}
            · {connection.lastUsedAt === null ? "Never used" : `Used ${used}`} ·{" "}
            {connection.lastVerifiedAt === null
              ? "Not checked"
              : `Checked ${checked}`}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center justify-end gap-1">
        <Button onClick={onVerify} size="sm" variant="ghost">
          Check
        </Button>
        {onRotate ? (
          <Button onClick={onRotate} size="sm" variant="ghost">
            Rotate
          </Button>
        ) : null}
        {connection.isDefault ? null : (
          <Button onClick={onDefault} size="sm" variant="outline">
            Make default
          </Button>
        )}
        <Button onClick={onRemove} size="sm" variant="ghost">
          Remove
        </Button>
      </div>
    </div>
  );
}

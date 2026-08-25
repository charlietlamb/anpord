import type {
  CredentialConnection,
  CredentialSelections,
} from "@anpord/schema/domain/credentials";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@anpord/ui/components/ui/select";
import { StatusBadge } from "@anpord/ui/components/ui/status-badge";
import { Link } from "@tanstack/react-router";
import { VariantLabel } from "@/components/evals/variant-label";
import {
  missingCredentialIntegrations,
  normalizeCredentialSelections,
} from "@/lib/evals/credential-selection";
import {
  harnessPresentation,
  providerPresentation,
} from "@/lib/evals/variant-presentation";

const SANDBOXES = new Set([
  "daytona",
  "e2b",
  "upstash",
  "modal",
  "cloudflare",
  "vercel",
]);

const presentationOf = (id: string) =>
  SANDBOXES.has(id) ? providerPresentation(id) : harnessPresentation(id);

const readinessLabel = (loading: boolean, missing: number) => {
  if (loading) {
    return "Checking";
  }
  return missing === 0 ? "Ready" : `${missing} missing`;
};

const readinessTone = (
  loading: boolean,
  missing: number
): "critical" | "pending" | "positive" => {
  if (loading) {
    return "pending";
  }
  return missing === 0 ? "positive" : "critical";
};

export function CredentialField({
  connections,
  integrationIds,
  loading,
  onChange,
  value,
}: {
  readonly connections: readonly CredentialConnection[];
  readonly integrationIds: readonly string[];
  readonly loading: boolean;
  readonly onChange: (value: CredentialSelections) => void;
  readonly value: CredentialSelections;
}) {
  const normalized = normalizeCredentialSelections(
    integrationIds,
    connections,
    value
  );
  const missing = missingCredentialIntegrations(
    integrationIds,
    connections,
    normalized
  );

  return (
    <div className="grid gap-3 rounded-xl border border-border p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-medium text-sm">Credentials</div>
          <p className="text-muted-foreground text-xs">
            Choose the account each selected harness and sandbox will use.
          </p>
        </div>
        <StatusBadge tone={readinessTone(loading, missing.length)}>
          {readinessLabel(loading, missing.length)}
        </StatusBadge>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {integrationIds.map((integrationId) => {
          const options = connections.filter(
            (connection) =>
              connection.integrationId === integrationId &&
              connection.status === "active"
          );
          const own = presentationOf(integrationId);
          const labelId = `credential-${integrationId}`;

          return (
            <div className="grid gap-1.5" key={integrationId}>
              <span className="font-medium text-xs" id={labelId}>
                <VariantLabel Icon={own.Icon}>{own.label}</VariantLabel>
              </span>
              <Select
                items={options.map((connection) => ({
                  label: connection.name,
                  value: connection.id,
                }))}
                onValueChange={(connectionId) =>
                  connectionId === null
                    ? undefined
                    : onChange({ ...normalized, [integrationId]: connectionId })
                }
                value={normalized[integrationId] ?? null}
              >
                <SelectTrigger
                  aria-invalid={options.length === 0}
                  aria-labelledby={labelId}
                  className="w-full"
                  disabled={options.length === 0}
                >
                  <SelectValue
                    placeholder={
                      loading ? "Checking connections…" : "No connection"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {options.map((connection) => (
                    <SelectItem key={connection.id} value={connection.id}>
                      {connection.name}
                      {connection.isDefault ? " · Default" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </div>

      {missing.length > 0 && !loading ? (
        <p className="text-destructive text-xs">
          Add the missing connections in{" "}
          <Link
            className="underline underline-offset-3"
            to="/settings/connections"
          >
            Settings
          </Link>
          .
        </p>
      ) : null}
    </div>
  );
}

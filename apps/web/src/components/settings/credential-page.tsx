import type {
  CredentialConnection,
  CredentialIntegration,
} from "@anpord/schema/domain/credentials";
import { Button } from "@anpord/ui/components/button";
import {
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableSkeleton,
} from "@anpord/ui/components/ui/data-table";
import { PlusIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ListState } from "@/components/layout/list-state";
import { PageHeader } from "@/components/layout/page-header";
import { ConnectedElsewhere } from "@/components/settings/connected-elsewhere";
import { ConnectionDialog } from "@/components/settings/connection-dialog";
import { ConnectionRow } from "@/components/settings/connection-row";
import { RotateConnectionDialog } from "@/components/settings/rotate-connection-dialog";
import { credentialQueries } from "@/lib/credential-queries";
import { credentialsClient } from "@/lib/credentials-client";
import type { ConnectionSectionSpec } from "@/lib/settings/connection-sections";
import { CONNECTIONS_TABLE } from "@/lib/settings/settings-tables";
import { useCredentialMutation } from "@/lib/settings/use-credential-mutation";

const rotatableMethodOf = (
  integration: CredentialIntegration | undefined,
  connection: CredentialConnection
) =>
  integration?.authMethods.find(
    (method) =>
      method.id === connection.authMethodId && method.kind !== "device"
  ) ?? null;

export function CredentialPage({
  spec,
}: {
  readonly spec: ConnectionSectionSpec;
}) {
  const [adding, setAdding] = useState(false);
  const [rotating, setRotating] = useState<CredentialConnection | null>(null);
  const integrations = useQuery(credentialQueries.integrations());
  const connections = useQuery(credentialQueries.connections());
  const awareness = useQuery(credentialQueries.awareness());
  const remove = useCredentialMutation({
    mutationFn: credentialsClient.remove,
  });
  const setDefault = useCredentialMutation({
    mutationFn: credentialsClient.setDefault,
  });
  const verify = useCredentialMutation({
    mutationFn: credentialsClient.verify,
    success: "Stored credential is valid",
  });

  const integrationOf = (id: string) =>
    integrations.data?.find((integration) => integration.id === id);
  const inCategory = (id: string) =>
    integrationOf(id)?.category === spec.category;
  const rows = (connections.data ?? []).filter((connection) =>
    inCategory(connection.integrationId)
  );
  const connected = new Set(rows.map((row) => row.integrationId));
  const elsewhere = (awareness.data ?? []).filter(
    (entry) =>
      !connected.has(entry.integrationId) && inCategory(entry.integrationId)
  );

  return (
    <>
      <PageHeader
        actions={
          <Button onClick={() => setAdding(true)} size="sm">
            <PlusIcon />
            {spec.addLabel}
          </Button>
        }
        description={spec.note}
        title={spec.title}
      />

      <ListState
        description={spec.empty}
        empty={rows.length === 0}
        error={connections.error ?? integrations.error}
        icon={<spec.Icon />}
        isPending={connections.isPending || integrations.isPending}
        skeleton={<DataTableSkeleton {...CONNECTIONS_TABLE} rows={2} />}
        title={spec.emptyTitle}
      >
        <DataTable
          columns={CONNECTIONS_TABLE.columns}
          label={CONNECTIONS_TABLE.label}
        >
          <DataTableHead headings={CONNECTIONS_TABLE.headings} />
          <DataTableBody>
            {rows.map((connection) => {
              const integration = integrationOf(connection.integrationId);

              return integration ? (
                <ConnectionRow
                  connection={connection}
                  integration={integration}
                  key={connection.id}
                  onDefault={() => setDefault.mutate(connection.id)}
                  onRemove={() => remove.mutate(connection.id)}
                  onRotate={
                    rotatableMethodOf(integration, connection) === null
                      ? undefined
                      : () => setRotating(connection)
                  }
                  onVerify={() => verify.mutate(connection.id)}
                />
              ) : null;
            })}
          </DataTableBody>
        </DataTable>
      </ListState>

      {elsewhere.map((entry) => (
        <ConnectedElsewhere
          integrationId={entry.integrationId}
          key={entry.integrationId}
          owners={entry.owners}
        />
      ))}

      {integrations.data ? (
        <ConnectionDialog
          category={spec.category}
          integrations={integrations.data}
          onClose={() => setAdding(false)}
          open={adding}
        />
      ) : null}

      <RotateConnectionDialog
        connection={rotating}
        method={
          rotating === null
            ? null
            : rotatableMethodOf(integrationOf(rotating.integrationId), rotating)
        }
        onClose={() => setRotating(null)}
      />
    </>
  );
}

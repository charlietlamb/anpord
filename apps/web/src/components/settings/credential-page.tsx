import type {
  CredentialConnection,
  CredentialIntegration,
} from "@anpord/schema/domain/credentials";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { ConnectedElsewhere } from "@/components/settings/connected-elsewhere";
import { ConnectionDialog } from "@/components/settings/connection-dialog";
import { ConnectionListSkeleton } from "@/components/settings/connection-list-skeleton";
import { ConnectionRow } from "@/components/settings/connection-row";
import { RotateConnectionDialog } from "@/components/settings/rotate-connection-dialog";
import { SettingsList } from "@/components/settings/settings-list";
import { SettingsPanel } from "@/components/settings/settings-panel";
import { SettingsState } from "@/components/settings/settings-state";
import { credentialKeys, credentialQueries } from "@/lib/credential-queries";
import { credentialsClient } from "@/lib/credentials-client";
import type { ConnectionSectionSpec } from "@/lib/settings/connection-sections";

const secretMethodOf = (
  integration: CredentialIntegration | undefined,
  connection: CredentialConnection
) =>
  integration?.authMethods.find(
    (method) =>
      method.id === connection.authMethodId && method.kind === "secret"
  ) ?? null;

/**
 * One category of stored credential, as a page.
 *
 * Harnesses and sandboxes differ in what they mean -- one is required, the
 * other overrides a default -- but not in what you do with them, so the
 * difference lives in the spec passed in and everything else is shared. Two
 * pages that read the same list and drew the same rows would drift the moment
 * one of them grew a column.
 */
export function CredentialPage({
  spec,
}: {
  readonly spec: ConnectionSectionSpec;
}) {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [rotating, setRotating] = useState<CredentialConnection | null>(null);
  const integrations = useQuery(credentialQueries.integrations());
  const connections = useQuery(credentialQueries.connections());
  const awareness = useQuery(credentialQueries.awareness());
  const refresh = useCallback(
    () =>
      queryClient.invalidateQueries({ queryKey: credentialKeys.connections() }),
    [queryClient]
  );
  const remove = useMutation({
    mutationFn: credentialsClient.remove,
    onError: (error) => toast.error(error.message),
    onSuccess: refresh,
  });
  const setDefault = useMutation({
    mutationFn: credentialsClient.setDefault,
    onError: (error) => toast.error(error.message),
    onSuccess: refresh,
  });
  const verify = useMutation({
    mutationFn: credentialsClient.verify,
    onError: (error) => toast.error(error.message),
    onSettled: refresh,
    onSuccess: () => toast.success("Stored credential is valid"),
  });

  const loading = connections.isPending || integrations.isPending;
  const error = connections.error ?? integrations.error;

  const integrationOf = (connection: CredentialConnection) =>
    integrations.data?.find(
      (integration) => integration.id === connection.integrationId
    );
  const rows = (connections.data ?? []).filter(
    (connection) => integrationOf(connection)?.category === spec.category
  );
  /* Only for an integration the reader has none of: once they have their own,
     whose else is beside the point. */
  const connected = new Set(rows.map((row) => row.integrationId));
  const elsewhere = (awareness.data ?? []).filter(
    (entry) =>
      !connected.has(entry.integrationId) &&
      integrations.data?.find(
        (integration) => integration.id === entry.integrationId
      )?.category === spec.category
  );

  return (
    <SettingsPanel
      /* Offered in the header once there is a list, and in the middle of the
         empty state before that, where it is the obvious next thing. */
      add={{ label: spec.addLabel, onAdd: () => setAdding(true) }}
      description={spec.note}
      /* Held back while loading too: the empty state carries the same action,
         and offering it twice for a list that may not be empty is a guess. */
      empty={loading || rows.length === 0}
      title={spec.title}
    >
      {loading || error ? (
        <SettingsState error={error} skeleton={<ConnectionListSkeleton />} />
      ) : (
        <SettingsList
          addLabel={spec.addLabel}
          empty={rows.length === 0 ? spec.empty : null}
          emptyTitle={spec.emptyTitle}
          Icon={spec.Icon}
          onAdd={() => setAdding(true)}
          title={spec.title}
        >
          {rows.map((connection) => {
            const integration = integrationOf(connection);

            return integration ? (
              <ConnectionRow
                connection={connection}
                integration={integration}
                key={connection.id}
                onDefault={() => setDefault.mutate(connection.id)}
                onRemove={() => remove.mutate(connection.id)}
                onRotate={
                  secretMethodOf(integration, connection) === null
                    ? undefined
                    : () => setRotating(connection)
                }
                onVerify={() => verify.mutate(connection.id)}
              />
            ) : null;
          })}
        </SettingsList>
      )}

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
          onCreated={refresh}
          open={adding}
        />
      ) : null}

      <RotateConnectionDialog
        connection={rotating}
        method={
          rotating === null
            ? null
            : secretMethodOf(integrationOf(rotating), rotating)
        }
        onClose={() => setRotating(null)}
        onRotated={refresh}
      />
    </SettingsPanel>
  );
}

import type {
  CredentialConnection,
  CredentialIntegration,
} from "@anpord/schema/domain/credentials";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { ConnectionDialog } from "@/components/settings/connection-dialog";
import { ConnectionListSkeleton } from "@/components/settings/connection-list-skeleton";
import { ConnectionRow } from "@/components/settings/connection-row";
import { ConnectionSection } from "@/components/settings/connection-section";
import { RotateConnectionDialog } from "@/components/settings/rotate-connection-dialog";
import { SettingsPanel } from "@/components/settings/settings-panel";
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

  if (connections.isPending || integrations.isPending) {
    return (
      <SettingsPanel>
        <ConnectionListSkeleton />
      </SettingsPanel>
    );
  }

  const error = connections.error ?? integrations.error;

  if (error) {
    return (
      <SettingsPanel>
        <p className="text-muted-foreground text-sm">{error.message}</p>
      </SettingsPanel>
    );
  }

  const integrationOf = (connection: CredentialConnection) =>
    integrations.data?.find(
      (integration) => integration.id === connection.integrationId
    );
  const rows = (connections.data ?? []).filter(
    (connection) => integrationOf(connection)?.category === spec.category
  );

  return (
    <SettingsPanel>
      <ConnectionSection
        addLabel={spec.addLabel}
        emptyNote={rows.length === 0 ? spec.empty : null}
        Icon={spec.Icon}
        note={spec.note}
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
      </ConnectionSection>

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

import type { CredentialConnection } from "@anpord/schema/domain/credentials";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { ConnectionForm } from "@/components/settings/connection-form";
import { ConnectionRow } from "@/components/settings/connection-row";
import { RotateConnectionDialog } from "@/components/settings/rotate-connection-dialog";
import { SettingsPanel } from "@/components/settings/settings-panel";
import { credentialKeys, credentialQueries } from "@/lib/credential-queries";
import { credentialsClient } from "@/lib/credentials-client";

export const Route = createFileRoute("/_authed/settings/connections")({
  component: ConnectionsPage,
  staticData: { title: "Connections" },
});

function ConnectionsPage() {
  const queryClient = useQueryClient();
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
  const integrationOf = (connection: CredentialConnection) =>
    integrations.data?.find(
      (integration) => integration.id === connection.integrationId
    );
  const rotationMethod = rotating
    ? (integrationOf(rotating)?.authMethods.find(
        (method) =>
          method.id === rotating.authMethodId && method.kind === "secret"
      ) ?? null)
    : null;

  return (
    <SettingsPanel description="Store reusable harness and sandbox credentials without exposing secret values after creation.">
      {integrations.data ? (
        <ConnectionForm integrations={integrations.data} onCreated={refresh} />
      ) : null}
      <div className="divide-y divide-border">
        {connections.data?.length === 0 ? (
          <p className="py-6 text-center text-muted-foreground text-xs">
            No connections yet.
          </p>
        ) : null}
        {(connections.data ?? []).map((connection) => {
          const integration = integrationOf(connection);

          return integration ? (
            <ConnectionRow
              connection={connection}
              integration={integration}
              key={connection.id}
              onDefault={() => setDefault.mutate(connection.id)}
              onRemove={() => remove.mutate(connection.id)}
              onRotate={
                integration.authMethods.some(
                  (method) =>
                    method.id === connection.authMethodId &&
                    method.kind === "secret"
                )
                  ? () => setRotating(connection)
                  : undefined
              }
              onVerify={() => verify.mutate(connection.id)}
            />
          ) : null;
        })}
      </div>
      <RotateConnectionDialog
        connection={rotating}
        method={rotationMethod}
        onClose={() => setRotating(null)}
        onRotated={refresh}
      />
    </SettingsPanel>
  );
}

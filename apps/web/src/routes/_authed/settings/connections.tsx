import type {
  CredentialConnection,
  CredentialIntegration,
} from "@anpord/schema/domain/credentials";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
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
import { CONNECTION_SECTIONS } from "@/lib/settings/connection-sections";

export const Route = createFileRoute("/_authed/settings/connections")({
  component: ConnectionsPage,
  staticData: { title: "Connections" },
});

const secretMethodOf = (
  integration: CredentialIntegration | undefined,
  connection: CredentialConnection
) =>
  integration?.authMethods.find(
    (method) =>
      method.id === connection.authMethodId && method.kind === "secret"
  ) ?? null;

function ConnectionsPage() {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState<"harness" | "sandbox" | null>(null);
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

  const rows = connections.data ?? [];

  return (
    <SettingsPanel>
      <div className="flex flex-col gap-7">
        {CONNECTION_SECTIONS.map((section) => {
          const own = rows.filter(
            (connection) =>
              integrationOf(connection)?.category === section.category
          );

          return (
            <ConnectionSection
              addLabel={section.addLabel}
              emptyNote={own.length === 0 ? section.empty : null}
              Icon={section.Icon}
              key={section.category}
              note={section.note}
              onAdd={() => setAdding(section.category)}
              title={section.title}
            >
              {own.map((connection) => {
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
          );
        })}
      </div>

      {integrations.data ? (
        <ConnectionDialog
          category={adding}
          integrations={integrations.data}
          key={adding ?? "closed"}
          onClose={() => setAdding(null)}
          onCreated={refresh}
          open={adding !== null}
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

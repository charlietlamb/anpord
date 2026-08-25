import type {
  CredentialConnection,
  CredentialIntegration,
} from "@anpord/schema/domain/credentials";
import { Button } from "@anpord/ui/components/button";
import { SectionLabel } from "@anpord/ui/components/ui/section-label";
import { KeyIcon, PlusIcon } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { ListState } from "@/components/layout/list-state";
import { RowList } from "@/components/layout/row-list";
import { ConnectionDialog } from "@/components/settings/connection-dialog";
import { ConnectionListSkeleton } from "@/components/settings/connection-list-skeleton";
import { ConnectionRow } from "@/components/settings/connection-row";
import { RotateConnectionDialog } from "@/components/settings/rotate-connection-dialog";
import { SettingsPanel } from "@/components/settings/settings-panel";
import { credentialKeys, credentialQueries } from "@/lib/credential-queries";
import { credentialsClient } from "@/lib/credentials-client";

export const Route = createFileRoute("/_authed/settings/connections")({
  component: ConnectionsPage,
  staticData: { title: "Connections" },
});

const DESCRIPTION =
  "Credentials the evals run with. Secrets are encrypted and never shown again.";

const GROUPS: readonly {
  readonly category: CredentialIntegration["category"];
  readonly title: string;
}[] = [
  { category: "harness", title: "Harnesses" },
  { category: "sandbox", title: "Sandboxes" },
];

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
  const integrationOf = (connection: CredentialConnection) =>
    integrations.data?.find(
      (integration) => integration.id === connection.integrationId
    );

  const rows = connections.data ?? [];
  const add = (
    <Button
      disabled={integrations.data === undefined}
      onClick={() => setAdding(true)}
      size="sm"
    >
      <PlusIcon />
      Add connection
    </Button>
  );

  return (
    /* The empty state offers the same button in the middle of the page, so
       the header only carries it once there is a list to sit above. */
    <SettingsPanel
      actions={rows.length === 0 ? undefined : add}
      description={DESCRIPTION}
    >
      <ListState
        action={add}
        description="Add a harness or sandbox credential and the evals can run with it."
        empty={rows.length === 0}
        error={connections.error ?? integrations.error}
        icon={<KeyIcon />}
        isPending={connections.isPending || integrations.isPending}
        skeleton={<ConnectionListSkeleton />}
        title="No connections yet"
      >
        <div className="flex flex-col gap-5">
          {GROUPS.map((group) => {
            const own = rows.filter(
              (connection) =>
                integrationOf(connection)?.category === group.category
            );

            if (own.length === 0) {
              return null;
            }

            return (
              <section className="flex flex-col gap-1" key={group.category}>
                <SectionLabel>{group.title}</SectionLabel>
                <RowList label={group.title}>
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
                </RowList>
              </section>
            );
          })}
        </div>
      </ListState>

      {integrations.data ? (
        <ConnectionDialog
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

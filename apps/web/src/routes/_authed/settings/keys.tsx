import { Button } from "@anpord/ui/components/button";
import { PlusIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { ListState } from "@/components/layout/list-state";
import { ApiKeyListSkeleton } from "@/components/settings/api-key-list-skeleton";
import { ApiKeyRow } from "@/components/settings/api-key-row";
import { SettingsPanel } from "@/components/settings/settings-panel";
import { useDialog } from "@/lib/dialog/dialogs";
import { apiKeyQueries } from "@/lib/query/api-key-queries";
import {
  useCreateApiKey,
  useRevokeApiKey,
} from "@/lib/query/use-api-key-mutations";
import { useOrganizations } from "@/lib/use-organizations";

export const Route = createFileRoute("/_authed/settings/keys")({
  component: ApiKeysPage,
  staticData: { title: "API keys" },
});

function ApiKeysPage() {
  const {
    close: closeDialog,
    open: openDialog,
    replace: replaceDialog,
  } = useDialog();
  const { activeOrganization } = useOrganizations();
  const organizationId = activeOrganization?.id ?? "";
  const keys = useQuery(apiKeyQueries.list(organizationId));
  const create = useCreateApiKey();
  const revoke = useRevokeApiKey();

  const onNew = () =>
    openDialog("newApiKey", {
      onSubmit: async (name) => {
        try {
          const created = await create.mutateAsync({
            name,
            organizationId,
          });
          if (created?.key) {
            replaceDialog("apiKeyCreated", { apiKey: created.key, name });
            return;
          }
          closeDialog();
        } catch (error) {
          toast.error("Couldn't create the key", {
            description: error instanceof Error ? error.message : undefined,
          });
        }
      },
    });

  const onRevoke = (id: string, name: string) =>
    openDialog("confirm", {
      confirmLabel: `Revoke ${name}`,
      description:
        "Anything using this key stops working within a few seconds. This cannot be undone.",
      destructive: true,
      onConfirm: () =>
        revoke.mutate(id, {
          onError: (error) =>
            toast.error("Couldn't revoke the key", {
              description: error.message,
            }),
          onSuccess: () => toast.success(`Revoked ${name}`),
        }),
      title: `Revoke ${name}?`,
    });

  const rows = keys.data ?? [];

  return (
    <SettingsPanel
      actions={
        <Button onClick={onNew} size="sm">
          <PlusIcon weight="bold" />
          New key
        </Button>
      }
      description="Authenticate the SDK and the CLI. A key acts for this organization."
    >
      <ApiKeyList
        error={keys.error}
        isPending={keys.isPending}
        onNew={onNew}
        onRevoke={onRevoke}
        rows={rows.map((row) => ({
          createdAt: row.createdAt,
          id: row.id,
          name: row.name ?? "Unnamed key",
          start: row.start,
        }))}
      />
    </SettingsPanel>
  );
}

interface ApiKeyListRow {
  readonly createdAt: Date | string;
  readonly id: string;
  readonly name: string;
  readonly start: string | null;
}

function ApiKeyList({
  error,
  isPending,
  onNew,
  onRevoke,
  rows,
}: {
  readonly error: Error | null;
  readonly isPending: boolean;
  readonly onNew: () => void;
  readonly onRevoke: (id: string, name: string) => void;
  readonly rows: readonly ApiKeyListRow[];
}) {
  return (
    <ListState
      action={
        <Button onClick={onNew} size="sm">
          <PlusIcon weight="bold" />
          New key
        </Button>
      }
      description="Create one to use the SDK or the CLI."
      empty={rows.length === 0}
      error={error}
      isPending={isPending}
      skeleton={<ApiKeyListSkeleton />}
      title="No keys yet"
    >
      <div className="flex flex-col">
        {rows.map((row) => (
          <ApiKeyRow
            createdAt={row.createdAt}
            key={row.id}
            name={row.name}
            onRevoke={() => onRevoke(row.id, row.name)}
            start={row.start}
          />
        ))}
      </div>
    </ListState>
  );
}

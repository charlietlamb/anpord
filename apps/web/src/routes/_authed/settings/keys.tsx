import { Button } from "@anpord/ui/components/button";
import { ROW_DIVIDERS } from "@anpord/ui/lib/row-dividers";
import { cn } from "@anpord/ui/lib/utils";
import { PlusIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
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
        "Anything using this key stops working immediately. This cannot be undone.",
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
      title="API keys"
    >
      {keys.isPending ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : (
        <ApiKeyList
          onRevoke={onRevoke}
          rows={rows.map((row) => ({
            createdAt: row.createdAt,
            id: row.id,
            name: row.name ?? "Unnamed key",
            start: row.start,
          }))}
        />
      )}
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
  onRevoke,
  rows,
}: {
  readonly onRevoke: (id: string, name: string) => void;
  readonly rows: readonly ApiKeyListRow[];
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-border-surface border-dashed px-6 py-12 text-center">
        <p className="font-heading text-base tracking-tight">No keys yet</p>
        <p className="mt-1 text-muted-foreground text-sm">
          Create one to use the SDK or the CLI.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border border-border-surface bg-sidebar-accent",
        ROW_DIVIDERS
      )}
    >
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
  );
}

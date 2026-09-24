import { Button } from "@anpord/ui/components/button";
import { PlusIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { ApiKeyList } from "@/components/settings/api-key-list";
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

  return (
    <>
      <PageHeader
        actions={
          <Button onClick={onNew} size="sm">
            <PlusIcon />
            New key
          </Button>
        }
        description="Authenticate the SDK and the CLI. A key acts for this organization."
        title="API keys"
      />
      <ApiKeyList
        error={keys.error}
        isPending={keys.isLoading}
        onRevoke={onRevoke}
        rows={keys.data ?? []}
      />
    </>
  );
}

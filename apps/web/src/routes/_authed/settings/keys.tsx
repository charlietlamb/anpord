import { Button } from "@anpord/ui/components/button";
import { PlusIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/page-header";
import { ApiKeyList } from "@/components/settings/api-key-list";
import { apiKeyQueries } from "@/lib/query/api-key-queries";
import { useApiKeyActions } from "@/lib/settings/use-api-key-actions";
import { useOrganizations } from "@/lib/use-organizations";

export const Route = createFileRoute("/_authed/settings/keys")({
  component: ApiKeysPage,
  staticData: { title: "API keys" },
});

function ApiKeysPage() {
  const { activeOrganization } = useOrganizations();
  const organizationId = activeOrganization?.id ?? "";
  const keys = useQuery(apiKeyQueries.list(organizationId));
  const { onNew, onRevoke } = useApiKeyActions(organizationId);

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

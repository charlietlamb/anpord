import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ConsentCard } from "@/components/auth/consent-card";
import { SiteLayout } from "@/components/layout/site-layout";
import { authClient, useSession } from "@/lib/auth-client";

const fetchClientName = async (clientId: string) => {
  const response = await fetch(
    `/api/oauth/clients/${encodeURIComponent(clientId)}`
  );
  if (!response.ok) {
    return;
  }
  const client = (await response.json()) as { name?: string };
  return client.name;
};

export const Route = createFileRoute("/oauth/consent")({
  component: ConsentPage,
  validateSearch: (
    search
  ): { client_id?: string; consent_code?: string; scope?: string } => ({
    client_id:
      typeof search.client_id === "string" ? search.client_id : undefined,
    consent_code:
      typeof search.consent_code === "string" ? search.consent_code : undefined,
    scope: typeof search.scope === "string" ? search.scope : undefined,
  }),
});

/** Fetched on the client: the name needs the session cookie. */
function ConsentPage() {
  const { client_id, scope } = Route.useSearch();
  const { data: session, isPending } = useSession();
  const { data: organization } = authClient.useActiveOrganization();
  const [name, setName] = useState<string>();

  useEffect(() => {
    if (!client_id) {
      return;
    }
    let active = true;
    fetchClientName(client_id).then((resolved) => {
      if (active) {
        setName(resolved);
      }
    });
    return () => {
      active = false;
    };
  }, [client_id]);

  if (!(isPending || session?.user)) {
    return <Navigate replace to="/login" />;
  }

  return (
    <SiteLayout center>
      <ConsentCard
        clientName={name ?? "An application"}
        organizationName={organization?.name}
        scopes={scope?.split(" ").filter(Boolean) ?? []}
      />
    </SiteLayout>
  );
}

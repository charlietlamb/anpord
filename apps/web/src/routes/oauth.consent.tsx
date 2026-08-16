import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { ConsentCard } from "@/components/auth/consent-card";
import { SiteLayout } from "@/components/layout/site-layout";
import { authClient, useSession } from "@/lib/auth-client";
import { oauthClientQueries } from "@/lib/query/oauth-client-queries";

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
  const { data: name } = useQuery(oauthClientQueries.name(client_id));

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

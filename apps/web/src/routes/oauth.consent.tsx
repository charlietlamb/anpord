import { createFileRoute, Navigate } from "@tanstack/react-router";
import { ConsentCard } from "@/components/auth/consent-card";
import { SiteLayout } from "@/components/layout/site-layout";
import { useSession } from "@/lib/auth-client";

const DEFAULT_SCOPES = ["openid", "profile"] as const;

export const Route = createFileRoute("/oauth/consent")({
  component: ConsentPage,
  validateSearch: (
    search
  ): { client_id?: string; client_name?: string; scope?: string } => ({
    client_id:
      typeof search.client_id === "string" ? search.client_id : undefined,
    client_name:
      typeof search.client_name === "string" ? search.client_name : undefined,
    scope: typeof search.scope === "string" ? search.scope : undefined,
  }),
});

function ConsentPage() {
  const { client_name, scope } = Route.useSearch();
  const { data: session, isPending } = useSession();

  if (!(isPending || session?.user)) {
    return <Navigate replace to="/login" />;
  }

  const scopes = scope ? scope.split(" ").filter(Boolean) : [...DEFAULT_SCOPES];

  return (
    <SiteLayout center>
      <ConsentCard
        clientName={client_name ?? "An application"}
        scopes={scopes}
      />
    </SiteLayout>
  );
}

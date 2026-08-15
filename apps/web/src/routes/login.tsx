import { createFileRoute, Navigate } from "@tanstack/react-router";
import { AuthCard } from "@/components/auth/auth-card";
import { SiteLayout } from "@/components/layout/site-layout";
import { useSession } from "@/lib/auth-client";
import { safeRedirect } from "@/lib/redirect";

export const Route = createFileRoute("/login")({
  validateSearch: (search): { redirect?: string } => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  component: LoginPage,
});

function LoginPage() {
  const { redirect } = Route.useSearch();
  const { data: session, isPending } = useSession();
  const target = safeRedirect(redirect);

  if (!isPending && session?.user) {
    return <Navigate replace to={target as "/"} />;
  }

  return (
    <SiteLayout center>
      <AuthCard redirect={target} />
    </SiteLayout>
  );
}

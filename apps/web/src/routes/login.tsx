import { Dither } from "@anpord/ui/components/ui/dither";
import { LANDING_DITHER } from "@anpord/ui/lib/dither-presets";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { SignInForm } from "@/components/auth/sign-in-form";
import { LandingNav } from "@/components/landing/landing-nav";
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
    <main className="relative isolate flex min-h-svh items-center justify-center bg-background px-6 text-foreground">
      <Dither preset={LANDING_DITHER} />
      <LandingNav signIn={false} />
      <SignInForm redirect={target} />
    </main>
  );
}

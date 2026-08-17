import { buttonVariants } from "@anpord/ui/lib/button-variants";
import { cn } from "@anpord/ui/lib/utils";
import { Link, useMatchRoute } from "@tanstack/react-router";
import { useSession } from "@/lib/auth-client";
import { DOCS_URL } from "@/lib/urls";
import { useIsClient } from "@/lib/use-is-client";

const linkClass = cn(
  buttonVariants({ variant: "ghost", size: "sm" }),
  "text-muted-foreground"
);

/**
 * Renders the signed-out label until the session settles, so the server and the
 * first client render agree and the width doesn't jump once it resolves.
 */
export function SiteNav() {
  const { data: session, isPending } = useSession();
  const isClient = useIsClient();
  const matchRoute = useMatchRoute();
  const signedIn = isClient && !isPending && Boolean(session?.user);
  const onLogin = Boolean(matchRoute({ to: "/login" }));

  return (
    <>
      <a className={linkClass} href={DOCS_URL} rel="noreferrer" target="_blank">
        Docs
      </a>
      {signedIn || !onLogin ? (
        <Link className={linkClass} to={signedIn ? "/" : "/login"}>
          {signedIn ? "Dashboard" : "Sign in"}
        </Link>
      ) : null}
    </>
  );
}

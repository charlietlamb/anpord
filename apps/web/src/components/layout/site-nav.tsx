import { buttonVariants } from "@anpord/ui/lib/button-variants";
import { cn } from "@anpord/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { DOCS_URL } from "@/lib/urls";

const linkClass = cn(
  buttonVariants({ size: "sm", variant: "ghost" }),
  "text-muted-foreground"
);

/**
 * Two links, the same for everyone.
 *
 * This used to read the session and swap between "Sign in" and "Dashboard",
 * which meant the marketing header could not render until the session
 * resolved, and rendered the signed-out label first either way. Someone
 * already signed in lands on the dashboard from /login regardless, so the
 * branch bought a word and cost a fetch on every page that shows this.
 */
export function SiteNav() {
  return (
    <>
      <a className={linkClass} href={DOCS_URL} rel="noreferrer" target="_blank">
        Docs
      </a>
      <Link className={linkClass} to="/login">
        Sign in
      </Link>
    </>
  );
}

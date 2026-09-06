import { buttonVariants } from "@anpord/ui/lib/button-variants";
import { cn } from "@anpord/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { DOCS_URL } from "@/lib/urls";

const linkClass = cn(
  buttonVariants({ size: "sm", variant: "ghost" }),
  "text-muted-foreground"
);

/* Deliberately session-free: reading it would block the marketing header on a fetch. */
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

import { buttonVariants } from "@anpord/ui/lib/button-variants";
import { cn } from "@anpord/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { PanelCard } from "@/components/layout/panel-card";
import { SiteLayout } from "@/components/layout/site-layout";
import { DOCS_URL } from "@/lib/urls";

const ELSEWHERE: readonly { readonly href: string; readonly label: string }[] =
  [
    { href: DOCS_URL, label: "Documentation" },
    { href: `${DOCS_URL}/api-reference/introduction`, label: "API reference" },
  ];

export function RootNotFound() {
  return (
    <SiteLayout center>
      <PanelCard
        description="That page does not exist. These do:"
        heading="h1"
        title="Page not found"
      >
        <nav aria-label="Where to go next" className="mt-5">
          <ul className="flex flex-col gap-2 text-sm">
            <li>
              <Link
                className="text-foreground underline underline-offset-2 hover:no-underline"
                to="/evals"
              >
                Evals
              </Link>
            </li>
            <li>
              <Link
                className="text-foreground underline underline-offset-2 hover:no-underline"
                to="/prompts"
              >
                Prompts
              </Link>
            </li>
            {ELSEWHERE.map(({ href, label }) => (
              <li key={href}>
                <a
                  className="text-foreground underline underline-offset-2 hover:no-underline"
                  href={href}
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <Link
          className={cn(
            buttonVariants({ size: "sm", variant: "ghost" }),
            "mt-6 -ml-3"
          )}
          to="/"
        >
          Back home
        </Link>
      </PanelCard>
    </SiteLayout>
  );
}

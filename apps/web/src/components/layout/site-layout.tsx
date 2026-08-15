import { cn } from "@anpord/ui/lib/utils";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/layout/site-header";

interface SiteLayoutProps {
  center?: boolean;
  children: ReactNode;
}

/**
 * The shell every signed-out page shares, so the logo and the content below it
 * hang off the same margin from the landing page through sign-in.
 */
export function SiteLayout({ children, center }: SiteLayoutProps) {
  return (
    <main className="bg-background text-foreground">
      <div className="mx-auto flex min-h-svh w-full max-w-3xl flex-col px-6">
        <SiteHeader />
        <div
          className={cn(
            "flex flex-1 flex-col",
            center && "items-center justify-center pb-24"
          )}
        >
          {children}
        </div>
      </div>
    </main>
  );
}

import { Dither } from "@anpord/ui/components/ui/dither";
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
    <main className="relative isolate bg-background text-foreground">
      <Dither className="fixed inset-0 -z-10 h-svh w-full text-foreground/[0.10]" />
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

import { Dither } from "@anpord/ui/components/ui/dither";
import { cn } from "@anpord/ui/lib/utils";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/layout/site-header";

interface SiteLayoutProps {
  center?: boolean;
  children: ReactNode;
  ditherClassName?: string;
}

export function SiteLayout({
  children,
  center,
  ditherClassName,
}: SiteLayoutProps) {
  return (
    <main className="relative isolate bg-background text-foreground">
      <Dither
        className={cn(
          "fixed inset-0 -z-10 h-svh w-full text-foreground/[0.14] dark:text-foreground/[0.12]",
          ditherClassName
        )}
      />
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

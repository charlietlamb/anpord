import { cn } from "@anpord/ui/lib/utils";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/layout/site-header";

interface SiteLayoutProps {
  center?: boolean;
  children: ReactNode;
}

export function SiteLayout({ children, center }: SiteLayoutProps) {
  return (
    <main className="flex min-h-svh flex-col bg-background text-foreground">
      <SiteHeader />
      <div
        className={cn(
          "flex flex-1 flex-col px-6",
          center && "items-center justify-center pb-16"
        )}
      >
        {children}
      </div>
    </main>
  );
}

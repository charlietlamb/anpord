import { Dither } from "@anpord/ui/components/ui/dither";
import type { DitherPreset } from "@anpord/ui/lib/dither-presets";
import type { HeaderPreset } from "@anpord/ui/lib/header-presets";
import { cn } from "@anpord/ui/lib/utils";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/layout/site-header";

interface SiteLayoutProps {
  center?: boolean;
  children: ReactNode;
  dither?: DitherPreset;
  header?: HeaderPreset;
}

export function SiteLayout({
  children,
  center,
  dither,
  header,
}: SiteLayoutProps) {
  return (
    <main className="relative isolate flex min-h-svh flex-col bg-background text-foreground">
      <Dither preset={dither} />
      <SiteHeader preset={header} />
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6">
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

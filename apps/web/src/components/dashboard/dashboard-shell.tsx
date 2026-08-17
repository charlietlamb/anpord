import { TooltipProvider } from "@anpord/ui/components/tooltip";
import { Dither } from "@anpord/ui/components/ui/dither";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@anpord/ui/components/ui/sidebar";
import { ClientOnly } from "@tanstack/react-router";
import { Hydrate } from "@tanstack/react-start";
import { idle } from "@tanstack/react-start/hydration";
import type { ReactNode } from "react";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { CommandMenu } from "@/components/dashboard/command-menu";
import { DashboardBreadcrumbs } from "@/components/dashboard/dashboard-breadcrumbs";

interface DashboardShellProps {
  children: ReactNode;
  sidebarOpen: boolean;
}

export function DashboardShell({ children, sidebarOpen }: DashboardShellProps) {
  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={sidebarOpen}>
        {/* Nothing is on screen until the shortcut fires, so the palette can
            wait for a quiet frame. It binds a global key listener rather than
            hanging off a trigger, which is why this waits for idle rather than
            for interaction with a boundary. */}
        <Hydrate when={idle()}>
          <ClientOnly>
            <CommandMenu />
          </ClientOnly>
        </Hydrate>
        <AppSidebar />
        <SidebarInset className="relative isolate overflow-hidden border border-sidebar-border ring-1 ring-black/[0.04] md:peer-data-[variant=inset]:shadow-md">
          <Hydrate when={idle()}>
            <Dither className="-z-10 text-foreground/[0.13] dark:text-foreground/[0.07]" />
          </Hydrate>
          <header className="flex h-11 items-center gap-2 border-border border-b px-4">
            <SidebarTrigger />
            <DashboardBreadcrumbs />
          </header>
          {children}
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}

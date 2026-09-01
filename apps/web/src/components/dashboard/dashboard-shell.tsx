import { TooltipProvider } from "@anpord/ui/components/tooltip";
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
import { ImpersonationBanner } from "@/components/dashboard/impersonation-banner";

interface DashboardShellProps {
  children: ReactNode;
  sidebarOpen: boolean;
}

export function DashboardShell({ children, sidebarOpen }: DashboardShellProps) {
  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={sidebarOpen}>
        <Hydrate when={idle()}>
          <ClientOnly>
            <CommandMenu />
          </ClientOnly>
        </Hydrate>
        <AppSidebar />
        <SidebarInset className="relative isolate overflow-hidden border border-sidebar-border bg-background md:peer-data-[variant=inset]:shadow-none">
          <ClientOnly>
            <ImpersonationBanner />
          </ClientOnly>
          <header className="sticky top-0 z-20 flex h-11 shrink-0 items-center gap-2 border-border-faint border-b bg-background px-4 transition-surface">
            <SidebarTrigger />
            <DashboardBreadcrumbs />
          </header>
          {children}
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}

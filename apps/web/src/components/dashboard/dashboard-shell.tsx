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
      <SidebarProvider
        className="relative isolate"
        data-dashboard=""
        defaultOpen={sidebarOpen}
      >
        <Hydrate when={idle()}>
          <ClientOnly>
            <CommandMenu />
          </ClientOnly>
        </Hydrate>
        <AppSidebar />
        <SidebarInset className="min-w-0 bg-transparent md:peer-data-[variant=inset]:mt-0 md:peer-data-[variant=inset]:rounded-none md:peer-data-[variant=inset]:shadow-none">
          <header className="flex h-11 shrink-0 items-center gap-1 px-3 md:px-1">
            <SidebarTrigger className="size-7 shrink-0 text-muted-foreground hover:bg-transparent hover:text-foreground active:bg-transparent" />
            <DashboardBreadcrumbs />
          </header>
          <div className="relative isolate flex min-h-0 flex-1 flex-col overflow-hidden bg-background md:rounded-xl md:border md:border-sidebar-border md:shadow-sm">
            <ClientOnly>
              <ImpersonationBanner />
            </ClientOnly>
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}

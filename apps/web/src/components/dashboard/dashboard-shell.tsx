import { TooltipProvider } from "@anpord/ui/components/tooltip";
import {
  SidebarInset,
  SidebarProvider,
} from "@anpord/ui/components/ui/sidebar";
import { PAGE_WIDTHS } from "@anpord/ui/lib/page-frame";
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
      <SidebarProvider className="relative isolate" defaultOpen={sidebarOpen}>
        <Hydrate when={idle()}>
          <ClientOnly>
            <CommandMenu />
          </ClientOnly>
        </Hydrate>
        <AppSidebar />
        <SidebarInset className="relative isolate min-w-0 overflow-hidden bg-background">
          <ClientOnly>
            <ImpersonationBanner />
          </ClientOnly>
          <header className="flex h-14 shrink-0 items-center pb-2">
            <div className={PAGE_WIDTHS.wide}>
              <DashboardBreadcrumbs />
            </div>
          </header>
          {children}
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}

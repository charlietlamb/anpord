import { TooltipProvider } from "@anpord/ui/components/tooltip";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@anpord/ui/components/ui/sidebar";
import { PAGE_WIDTHS } from "@anpord/ui/lib/page-frame";
import { cn } from "@anpord/ui/lib/utils";
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
        <SidebarInset className="relative isolate min-w-0 overflow-hidden bg-background md:peer-data-[variant=inset]:border md:peer-data-[variant=inset]:border-sidebar-border">
          <ClientOnly>
            <ImpersonationBanner />
          </ClientOnly>
          <header className="flex h-11 shrink-0 items-center border-b">
            <div className={cn(PAGE_WIDTHS.wide, "flex items-center gap-1")}>
              <SidebarTrigger className="-ml-1 size-7 shrink-0 text-muted-foreground hover:bg-transparent hover:text-foreground active:bg-transparent" />
              <DashboardBreadcrumbs />
            </div>
          </header>
          {children}
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}

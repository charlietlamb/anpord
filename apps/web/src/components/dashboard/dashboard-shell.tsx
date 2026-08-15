import { TooltipProvider } from "@anpord/ui/components/tooltip";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@anpord/ui/components/ui/sidebar";
import { ClientOnly } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { CommandMenu } from "@/components/dashboard/command-menu";
import { usePageTitle } from "@/lib/use-page-title";

interface DashboardShellProps {
  children: ReactNode;
  sidebarOpen: boolean;
}

export function DashboardShell({ children, sidebarOpen }: DashboardShellProps) {
  const title = usePageTitle();

  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={sidebarOpen}>
        <ClientOnly>
          <CommandMenu />
        </ClientOnly>
        <AppSidebar />
        <SidebarInset className="relative overflow-hidden border border-sidebar-border ring-1 ring-black/[0.04] md:peer-data-[variant=inset]:shadow-md">
          <header className="flex h-14 items-center gap-2 border-border border-b px-4">
            <SidebarTrigger />
            <span className="font-heading text-base tracking-[-0.02em]">
              {title}
            </span>
          </header>
          {children}
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}

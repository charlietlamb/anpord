import { Skeleton } from "@anpord/ui/components/skeleton";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@anpord/ui/components/ui/sidebar";
import { ClientOnly, Link, useLocation } from "@tanstack/react-router";
import {
  DASHBOARD_NAV,
  isNavItemActive,
} from "@/components/dashboard/dashboard-nav";
import { NavUser } from "@/components/dashboard/nav-user";
import { OrgSwitcher } from "@/components/dashboard/org-switcher";

export function AppSidebar() {
  const { pathname } = useLocation();

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <ClientOnly fallback={<Skeleton className="h-12 w-full rounded-md" />}>
          <OrgSwitcher />
        </ClientOnly>
      </SidebarHeader>

      <SidebarContent>
        {DASHBOARD_NAV.map((section) => (
          <SidebarGroup
            key={
              section.label ?? section.items.map((item) => item.to).join(",")
            }
          >
            {section.label ? (
              <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            ) : null}
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton
                      className="group-data-[collapsible=icon]:justify-center"
                      isActive={isNavItemActive(item, pathname)}
                      render={<Link to={item.to} />}
                      tooltip={item.label}
                    >
                      <item.icon weight={item.iconWeight ?? "fill"} />
                      <span className="group-data-[collapsible=icon]:hidden">
                        {item.label}
                      </span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <ClientOnly fallback={<Skeleton className="h-12 w-full rounded-md" />}>
          <NavUser />
        </ClientOnly>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

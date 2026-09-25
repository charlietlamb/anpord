import { Logo } from "@anpord/ui/components/logo";
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
import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { ClientOnly, Link, useLocation } from "@tanstack/react-router";
import {
  activeNavPath,
  DASHBOARD_NAV,
} from "@/components/dashboard/dashboard-nav";
import { NavUser } from "@/components/dashboard/nav-user";
import { NavUserPlaceholder } from "@/components/dashboard/nav-user-placeholder";

export function AppSidebar() {
  const { pathname } = useLocation();
  const activePath = activeNavPath(pathname);

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader className="gap-1 px-2 py-0">
        <div className="relative flex h-11 items-center gap-2 px-2">
          <Link
            aria-label="Home"
            className="shrink-0 cursor-pointer text-foreground transition-colors hover:text-muted-foreground"
            to="/home"
          >
            <Logo className="size-5" />
          </Link>
          <SidebarMenuButton
            aria-label="Search"
            className="ml-auto size-7 text-muted-foreground group-data-[collapsible=icon]:hidden"
            onClick={() =>
              window.dispatchEvent(
                new KeyboardEvent("keydown", { key: "k", metaKey: true })
              )
            }
            tooltip="Search"
          >
            <MagnifyingGlassIcon />
          </SidebarMenuButton>
        </div>
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
                {section.items.map((item) => {
                  const active = item.to === activePath;

                  return (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton
                        className="font-normal group-data-[collapsible=icon]:justify-center"
                        isActive={active}
                        render={<Link to={item.to} />}
                        tooltip={item.label}
                      >
                        <item.icon weight={active ? "fill" : "regular"} />
                        <span className="group-data-[collapsible=icon]:hidden">
                          {item.label}
                        </span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <ClientOnly fallback={<NavUserPlaceholder />}>
          <NavUser />
        </ClientOnly>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

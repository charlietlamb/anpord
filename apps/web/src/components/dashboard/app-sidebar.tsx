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
  SidebarTrigger,
  useSidebar,
} from "@anpord/ui/components/ui/sidebar";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { ClientOnly, Link, useLocation } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import {
  DASHBOARD_NAV,
  isNavItemActive,
} from "@/components/dashboard/dashboard-nav";
import { NavUser } from "@/components/dashboard/nav-user";
import { NavUserSkeleton } from "@/components/dashboard/nav-user-skeleton";

export function AppSidebar() {
  const { pathname } = useLocation();
  const { state } = useSidebar();
  const reduceMotion = useReducedMotion();

  return (
    <Sidebar
      className="border-sidebar-border border-r"
      collapsible="icon"
      variant="sidebar"
    >
      <SidebarHeader className="gap-1 px-2 py-0">
        <div className="relative flex h-11 items-center gap-2 px-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <Link
            aria-label="Home"
            className="shrink-0 cursor-pointer text-foreground transition-colors hover:text-muted-foreground group-data-[collapsible=icon]:hidden"
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
          <motion.div
            animate={{ opacity: 1 }}
            className="group-data-[collapsible=icon]:absolute group-data-[collapsible=icon]:inset-0 group-data-[collapsible=icon]:z-20 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center"
            initial={
              state === "collapsed" && !reduceMotion ? { opacity: 0 } : false
            }
            transition={{
              delay: state === "collapsed" && !reduceMotion ? 0.16 : 0,
              duration: reduceMotion ? 0 : 0.15,
              ease: "easeOut",
            }}
          >
            <SidebarTrigger className="size-7 text-muted-foreground hover:bg-transparent hover:text-foreground active:bg-transparent" />
          </motion.div>
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
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton
                      className="font-normal group-data-[collapsible=icon]:justify-center"
                      isActive={isNavItemActive(item, pathname)}
                      render={<Link to={item.to} />}
                      tooltip={item.label}
                    >
                      <item.icon
                        weight={
                          isNavItemActive(item, pathname)
                            ? (item.iconWeight ?? "fill")
                            : "regular"
                        }
                      />
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
        <ClientOnly fallback={<NavUserSkeleton />}>
          <NavUser />
        </ClientOnly>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

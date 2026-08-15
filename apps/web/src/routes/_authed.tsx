import { createFileRoute, Outlet } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Landing } from "@/components/landing/landing";
import { getSession } from "@/lib/get-session";
import { getSidebarState } from "@/lib/get-sidebar-state";

export const Route = createFileRoute("/_authed")({
  beforeLoad: async () => {
    const [{ authenticated }, sidebarOpen] = await Promise.all([
      getSession(),
      Promise.resolve(getSidebarState()),
    ]);
    return { authenticated, sidebarOpen };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const { authenticated, sidebarOpen } = Route.useRouteContext();

  if (!authenticated) {
    return <Landing />;
  }

  return (
    <DashboardShell sidebarOpen={sidebarOpen}>
      <Outlet />
    </DashboardShell>
  );
}

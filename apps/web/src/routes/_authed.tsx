import { createFileRoute, Outlet } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Landing } from "@/components/landing/landing";
import { getSidebarState } from "@/lib/get-sidebar-state";
import { sessionQuery } from "@/lib/session-query";

export const Route = createFileRoute("/_authed")({
  beforeLoad: async ({ context }) => {
    const { authenticated } =
      await context.queryClient.fetchQuery(sessionQuery);
    return { authenticated, sidebarOpen: getSidebarState() };
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

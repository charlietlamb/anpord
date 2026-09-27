import { createFileRoute, Outlet } from "@tanstack/react-router";
import { LazyDashboardShell } from "@/components/dashboard/lazy-dashboard-shell";
import { Landing } from "@/components/landing/landing";
import { getSidebarState } from "@/lib/get-sidebar-state";
import { sessionQuery } from "@/lib/session-query";
import { ssrModulePreloads } from "@/lib/ssr-module-preloads";

export const Route = createFileRoute("/_authed")({
  beforeLoad: async ({ context }) => {
    const { authenticated } =
      await context.queryClient.fetchQuery(sessionQuery);
    if (authenticated) {
      await LazyDashboardShell.preload();
    }
    return { authenticated, sidebarOpen: getSidebarState() };
  },
  head: ({ match }) => ({
    links: match.context.authenticated
      ? ssrModulePreloads("src/components/dashboard/dashboard-shell.tsx")
      : [],
  }),
  component: AuthedLayout,
});

function AuthedLayout() {
  const { authenticated, sidebarOpen } = Route.useRouteContext();

  if (!authenticated) {
    return <Landing />;
  }

  return (
    <LazyDashboardShell.Component sidebarOpen={sidebarOpen}>
      <Outlet />
    </LazyDashboardShell.Component>
  );
}

import { IconContext } from "@phosphor-icons/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { LazyDashboardShell } from "@/components/dashboard/lazy-dashboard-shell";
import { createQueryClient } from "@/lib/query/query-client";
import { sessionQuery } from "@/lib/session-query";
import { routeTree } from "./routeTree.gen";

const ICONS = { weight: "bold" } as const;

export function getRouter() {
  const queryClient = createQueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    dehydrate: () => ({
      authenticated:
        queryClient.getQueryData(sessionQuery.queryKey)?.authenticated === true,
    }),
    hydrate: async ({ authenticated }) => {
      if (authenticated) {
        await LazyDashboardShell.preload();
      }
    },
    Wrap: ({ children }) => (
      <IconContext.Provider value={ICONS}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </IconContext.Provider>
    ),
  });

  setupRouterSsrQueryIntegration({
    router,
    queryClient,
    wrapQueryClient: false,
  });

  return router;
}

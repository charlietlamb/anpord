import { IconContext } from "@phosphor-icons/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { createQueryClient } from "@/lib/query/query-client";
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

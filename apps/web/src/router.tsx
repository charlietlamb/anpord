import { QueryClientProvider } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { createQueryClient } from "@/lib/query/query-client";
import { routeTree } from "./routeTree.gen";

/**
 * TanStack Start calls this once per request, so the client built here is never
 * shared between users — the cache cannot leak one session's prompts into
 * another's render.
 */
export function getRouter() {
  const queryClient = createQueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    /**
     * The provider is mounted here rather than by the SSR integration because
     * that package inlines its own copy of QueryClientContext; a provider from
     * that copy publishes on a context our components never read, which throws
     * "No QueryClient set" at render.
     */
    Wrap: ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });

  setupRouterSsrQueryIntegration({
    router,
    queryClient,
    wrapQueryClient: false,
  });

  return router;
}

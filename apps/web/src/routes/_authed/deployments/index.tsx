import { useInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { DeploymentsScreen } from "@/components/deployments/deployments-screen";
import { deploymentQueries } from "@/lib/query/deployment-queries";

export const Route = createFileRoute("/_authed/deployments/")({
  /** The client fetches these: the API is addressed relatively, which has no
   * base on the server, and the session cookie is the browser's to send. */
  ssr: false,
  loader: async ({ context }) => {
    const { deploymentQueries: queries } = await import(
      "@/lib/query/deployment-queries"
    );
    return context.queryClient.ensureInfiniteQueryData(queries.list());
  },
  component: DeploymentsPage,
});

function DeploymentsPage() {
  const deployments = useInfiniteQuery(deploymentQueries.list());

  return (
    <DeploymentsScreen
      error={deployments.error}
      hasMore={deployments.hasNextPage}
      isLoadingMore={deployments.isFetchingNextPage}
      isPending={deployments.isPending}
      onLoadMore={() => deployments.fetchNextPage()}
      rows={deployments.data?.pages.flat() ?? []}
    />
  );
}

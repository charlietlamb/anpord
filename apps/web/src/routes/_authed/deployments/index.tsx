import { createFileRoute } from "@tanstack/react-router";
import { PlacementsScreen } from "@/components/placements/placements-screen";
import { usePlacementsPage } from "@/lib/placements/use-placements-page";

const filtersFrom = (search: Record<string, unknown>) => ({
  search: typeof search.q === "string" ? search.q : "",
});

export const Route = createFileRoute("/_authed/deployments/")({
  loaderDeps: ({ search }) => filtersFrom(search),
  /** The client fetches these: the API is addressed relatively, which has no
   * base on the server, and the session cookie is the browser's to send. */
  ssr: false,
  loader: async ({ context, deps }) => {
    const { placementQueries } = await import("@/lib/query/placement-queries");
    return context.queryClient.ensureInfiniteQueryData(
      placementQueries.list(deps)
    );
  },
  component: DeploymentsPage,
  staticData: { title: "Deployments" },
});

function DeploymentsPage() {
  return <PlacementsScreen {...usePlacementsPage()} />;
}

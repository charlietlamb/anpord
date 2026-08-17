import { useInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { parseAsString, useQueryState } from "nuqs";
import { DeploymentsScreen } from "@/components/deployments/deployments-screen";
import { deploymentQueries } from "@/lib/query/deployment-queries";

interface DeploymentSearch {
  readonly channel?: string;
  readonly prompt?: string;
}

const filtersFrom = (search: Record<string, unknown>): DeploymentSearch => ({
  channel: typeof search.channel === "string" ? search.channel : undefined,
  prompt: typeof search.prompt === "string" ? search.prompt : undefined,
});

export const Route = createFileRoute("/_authed/deployments/")({
  loaderDeps: ({ search }) => filtersFrom(search),
  /** The client fetches these: the API is addressed relatively, which has no
   * base on the server, and the session cookie is the browser's to send. */
  ssr: false,
  loader: async ({ context, deps }) => {
    const { deploymentQueries: queries } = await import(
      "@/lib/query/deployment-queries"
    );
    return context.queryClient.ensureInfiniteQueryData(queries.list(deps));
  },
  component: DeploymentsPage,
  staticData: { title: "Deployments" },
});

function DeploymentsPage() {
  const [channel, setChannel] = useQueryState(
    "channel",
    parseAsString.withDefault("").withOptions({ clearOnDefault: true })
  );

  const [prompt, setPrompt] = useQueryState(
    "prompt",
    parseAsString.withDefault("").withOptions({ clearOnDefault: true })
  );

  const filters = {
    channel: channel || undefined,
    prompt: prompt || undefined,
  };

  const deployments = useInfiniteQuery(deploymentQueries.list(filters));

  return (
    <DeploymentsScreen
      channel={channel}
      error={deployments.error}
      hasMore={deployments.hasNextPage}
      isLoadingMore={deployments.isFetchingNextPage}
      isPending={deployments.isPending}
      onChannelChange={setChannel}
      onClearPrompt={() => setPrompt(null)}
      onLoadMore={() => deployments.fetchNextPage()}
      prompt={prompt}
      rows={deployments.data?.pages.flatMap((page) => page.items) ?? []}
    />
  );
}

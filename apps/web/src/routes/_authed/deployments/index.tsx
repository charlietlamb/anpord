import type { PlacementChange } from "@anpord/schema/domain/placements";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { parseAsString, useQueryState } from "nuqs";
import { toast } from "sonner";
import { PlacementsScreen } from "@/components/placements/placements-screen";
import { useDialog } from "@/lib/dialog/dialogs";
import { orderedChanges } from "@/lib/placements/staged-changes";
import { useStagedPlacements } from "@/lib/placements/use-staged-placements";
import { channelQueries } from "@/lib/query/channel-queries";
import { placementQueries } from "@/lib/query/placement-queries";
import { useApplyPlacements } from "@/lib/query/use-apply-placements";

const SEARCH_THROTTLE_MS = 250;

const filtersFrom = (search: Record<string, unknown>) => ({
  search: typeof search.q === "string" ? search.q : "",
});

export const Route = createFileRoute("/_authed/deployments/")({
  loaderDeps: ({ search }) => filtersFrom(search),
  /** The client fetches these: the API is addressed relatively, which has no
   * base on the server, and the session cookie is the browser's to send. */
  ssr: false,
  loader: async ({ context, deps }) => {
    const { placementQueries: queries } = await import(
      "@/lib/query/placement-queries"
    );
    return context.queryClient.ensureInfiniteQueryData(queries.list(deps));
  },
  component: DeploymentsPage,
  staticData: { title: "Deployments" },
});

function DeploymentsPage() {
  const [search, setSearch] = useQueryState(
    "q",
    parseAsString
      .withDefault("")
      .withOptions({ clearOnDefault: true, throttleMs: SEARCH_THROTTLE_MS })
  );

  const placements = useInfiniteQuery(placementQueries.list({ search }));
  const channels = useQuery(channelQueries.list());
  const apply = useApplyPlacements();
  const { open: openDialog } = useDialog();
  const staging = useStagedPlacements();

  const rows = placements.data?.pages.flatMap((page) => page.items) ?? [];
  const totals = placements.data?.pages[0]?.totals ?? null;

  /** Every channel the organisation defines, so a prompt that has never used
   * one still shows an empty cell to point it at. */
  const channelNames = (channels.data ?? []).map((channel) => channel.name);

  const onApply = () => {
    const changes = orderedChanges(staging.staged);

    openDialog("applyPlacements", {
      changes,
      onConfirm: async () => {
        const payload: PlacementChange[] = changes.map((change) => ({
          channel: change.channel,
          promptId: change.promptId,
          version: change.to,
        })) as PlacementChange[];

        const response = await apply.mutateAsync(payload);
        const failed = response.results.filter(
          (result) => result.error !== null
        );

        if (failed.length === 0) {
          staging.discard();
          return;
        }

        toast.error(
          `Couldn't apply ${failed.length} of ${changes.length} changes`,
          { description: failed[0]?.error ?? undefined }
        );
      },
    });
  };

  return (
    <PlacementsScreen
      applying={apply.isPending}
      changeFor={staging.changeFor}
      channels={channelNames}
      error={placements.error}
      hasMore={placements.hasNextPage}
      isLoadingMore={placements.isFetchingNextPage}
      isPending={placements.isPending}
      onApply={onApply}
      onDiscard={staging.discard}
      onLoadMore={() => placements.fetchNextPage()}
      onSearch={setSearch}
      onStage={staging.stageOne}
      onStageLatest={staging.stageLatest}
      rows={rows}
      search={search}
      staged={staging.staged}
      totals={totals}
    />
  );
}

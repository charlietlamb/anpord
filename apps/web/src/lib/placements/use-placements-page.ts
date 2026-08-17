import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { parseAsString, useQueryState } from "nuqs";
import { toast } from "sonner";
import { useDialog } from "@/lib/dialog/dialogs";
import {
  orderedChanges,
  type StagedChange,
  toPlacementChange,
  toReversal,
} from "@/lib/placements/staged-changes";
import { useStagedPlacements } from "@/lib/placements/use-staged-placements";
import { channelQueries } from "@/lib/query/channel-queries";
import { placementQueries } from "@/lib/query/placement-queries";
import { useApplyPlacements } from "@/lib/query/use-apply-placements";

const SEARCH_THROTTLE_MS = 250;

const countOf = (count: number) =>
  `${count} ${count === 1 ? "change" : "changes"}`;

const cellOf = (change: { channel: string; promptId: string }) =>
  `${change.promptId}:${change.channel}`;

/**
 * Everything the deployments page does, so the route renders and nothing else.
 *
 * The staged edits, the review, the write and what happens afterwards belong
 * together: each step reads the one before it, and splitting them across the
 * route and the screen is what made the change list travel as seventeen props.
 */
export function usePlacementsPage() {
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

  const commit = async (changes: readonly StagedChange[]) => {
    const response = await apply.mutateAsync(changes.map(toPlacementChange));
    const failed = response.results.filter((result) => result.error !== null);

    staging.discard();

    if (failed.length > 0) {
      toast.error(`Couldn't apply ${countOf(failed.length)}`, {
        description: failed[0]?.error ?? undefined,
      });
    }

    /** Offered for the batch rather than per change, because the batch is the
     * unit anyone decided on, and only for what actually moved. */
    const rejected = new Set(failed.map((result) => cellOf(result.change)));
    const reversals = changes
      .filter((change) => !rejected.has(cellOf(change)))
      .map(toReversal)
      .filter((change) => change !== null);

    if (reversals.length === 0) {
      return;
    }

    toast.success(`Applied ${countOf(changes.length - failed.length)}`, {
      action: { label: "Undo", onClick: () => apply.mutate(reversals) },
    });
  };

  return {
    applying: apply.isPending,
    changeFor: staging.changeFor,
    /** Every channel the organisation defines, so a prompt that has never used
     * one still shows an empty cell to point it at. */
    channels: (channels.data ?? []).map((channel) => channel.name),
    error: placements.error,
    hasMore: placements.hasNextPage,
    isLoadingMore: placements.isFetchingNextPage,
    isPending: placements.isPending,
    onApply: () => {
      const changes = orderedChanges(staging.staged);
      openDialog("applyPlacements", {
        changes,
        onConfirm: () => commit(changes),
      });
    },
    onDiscard: staging.discard,
    onLoadMore: () => placements.fetchNextPage(),
    onSearch: setSearch,
    onStage: staging.stageOne,
    onStageLatest: staging.stageLatest,
    rows: placements.data?.pages.flatMap((page) => page.items) ?? [],
    search,
    staged: staging.staged,
    totals: placements.data?.pages[0]?.totals ?? null,
  };
}

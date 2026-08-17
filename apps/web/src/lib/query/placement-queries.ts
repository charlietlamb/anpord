import { infiniteQueryOptions } from "@tanstack/react-query";
import { listPlacements } from "@/lib/placements-client";
import { placementKeys } from "@/lib/query/placement-keys";

const PAGE_SIZE = 25;

export interface PlacementFilters {
  readonly search: string;
}

export const placementQueries = {
  list: (filters: PlacementFilters) =>
    infiniteQueryOptions({
      queryKey: placementKeys.list(filters),
      queryFn: ({ pageParam }) =>
        listPlacements({
          cursor: pageParam ?? undefined,
          limit: PAGE_SIZE,
          q: filters.search || undefined,
        }),
      initialPageParam: null as string | null,
      getNextPageParam: (page) => page.nextCursor ?? undefined,
    }),
} as const;

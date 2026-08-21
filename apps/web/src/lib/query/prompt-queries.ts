import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { listChannels, listPrompts, listVersions } from "@/lib/prompts-client";
import { promptKeys } from "@/lib/query/prompt-keys";
import type { PromptListFilters } from "@/lib/query/prompt-list-filters";

export const promptQueries = {
  list: (filters: PromptListFilters) =>
    infiniteQueryOptions({
      queryKey: promptKeys.list(filters),
      queryFn: ({ pageParam }) =>
        listPrompts({
          cursor: pageParam ?? undefined,
          q: filters.search || undefined,
          sort: filters.sort,
          status: filters.status,
        }),
      initialPageParam: null as string | null,
      getNextPageParam: (page) => page.nextCursor,
    }),

  versions: (id: string) =>
    queryOptions({
      queryKey: promptKeys.versions(id),
      queryFn: () => listVersions(id),
    }),

  channels: (id: string) =>
    queryOptions({
      queryKey: promptKeys.channels(id),
      queryFn: () => listChannels(id),
    }),
} as const;

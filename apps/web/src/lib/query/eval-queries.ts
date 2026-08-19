import { queryOptions } from "@tanstack/react-query";
import { getEvalRun, listEvalRuns } from "@/lib/evals-client";
import { evalKeys } from "@/lib/query/eval-keys";

/** A run in flight is refetched while it lasts and left alone once it is
 * finished, so a page of settled runs makes no requests at all. */
const FOLLOW_MS = 1500;

export const evalQueries = {
  detail: (id: string) =>
    queryOptions({
      queryKey: evalKeys.detail(id),
      queryFn: () => getEvalRun(id),
      refetchInterval: (query) =>
        query.state.data?.status === "running" ? FOLLOW_MS : false,
      staleTime: 0,
    }),

  list: () =>
    queryOptions({
      queryKey: evalKeys.list(),
      queryFn: listEvalRuns,
      staleTime: 0,
    }),
} as const;

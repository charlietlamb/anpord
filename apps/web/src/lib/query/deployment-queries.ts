import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import type { DeploymentFilters } from "@/lib/deployments-client";
import { listDeployments } from "@/lib/deployments-client";
import { deploymentKeys } from "@/lib/query/deployment-keys";

const PAGE_SIZE = 25;

/** The rail sits beside the editor rather than being the page, so it carries
 * enough to show the recent shape of a prompt and no more. */
const RAIL_SIZE = 5;

type DeploymentListFilters = Pick<DeploymentFilters, "channel" | "prompt">;

export const deploymentQueries = {
  list: (filters: DeploymentListFilters = {}) =>
    infiniteQueryOptions({
      queryKey: deploymentKeys.list(filters),
      queryFn: ({ pageParam }) =>
        listDeployments({
          ...filters,
          cursor: pageParam ?? undefined,
          limit: PAGE_SIZE,
        }),
      initialPageParam: null as string | null,
      getNextPageParam: (page) => page.nextCursor ?? undefined,
    }),

  forPrompt: (promptId: string) =>
    queryOptions({
      queryKey: deploymentKeys.forPrompt(promptId),
      queryFn: () => listDeployments({ limit: RAIL_SIZE, prompt: promptId }),
    }),
} as const;

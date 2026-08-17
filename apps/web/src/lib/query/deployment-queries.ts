import { infiniteQueryOptions } from "@tanstack/react-query";
import type { DeploymentFilters } from "@/lib/deployments-client";
import { listDeployments } from "@/lib/deployments-client";
import { deploymentKeys } from "@/lib/query/deployment-keys";

const DEPLOYMENTS_PAGE_SIZE = 25;

type DeploymentListFilters = Pick<DeploymentFilters, "channel" | "prompt">;

export const deploymentQueries = {
  list: (filters: DeploymentListFilters = {}) =>
    infiniteQueryOptions({
      queryKey: deploymentKeys.list(filters),
      queryFn: ({ pageParam }) =>
        listDeployments({
          ...filters,
          before: pageParam ?? undefined,
          limit: DEPLOYMENTS_PAGE_SIZE,
        }),
      initialPageParam: null as Date | null,
      /** The endpoint returns rows rather than a cursor, so the next page
       * starts at the oldest row already read. A short page means there was
       * nothing left to fill it. */
      getNextPageParam: (page) =>
        page.length < DEPLOYMENTS_PAGE_SIZE
          ? undefined
          : (page.at(-1)?.deployedAt ?? undefined),
    }),
} as const;

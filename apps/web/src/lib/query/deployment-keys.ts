import type { DeploymentFilters } from "@/lib/deployments-client";

export const deploymentKeys = {
  all: ["deployments"] as const,
  lists: () => [...deploymentKeys.all, "list"] as const,
  list: (filters: Pick<DeploymentFilters, "channel" | "prompt">) =>
    [...deploymentKeys.lists(), filters] as const,
} as const;

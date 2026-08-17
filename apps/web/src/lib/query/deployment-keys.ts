import type { DeploymentFilters } from "@/lib/deployments-client";

export const deploymentKeys = {
  all: ["deployments"] as const,
  lists: () => [...deploymentKeys.all, "list"] as const,
  list: (filters: Pick<DeploymentFilters, "channel" | "prompt">) =>
    [...deploymentKeys.lists(), filters] as const,
  /** The rail reads the same log as the list, so it sits under the same prefix
   * and a promotion invalidates both at once. */
  forPrompt: (promptId: string) =>
    [...deploymentKeys.all, "prompt", promptId] as const,
} as const;

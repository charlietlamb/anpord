import { queryOptions } from "@tanstack/react-query";
import { listDeployments } from "@/lib/deployments-client";
import { deploymentKeys } from "@/lib/query/deployment-keys";

/** The rail sits beside the editor rather than being the page, so it carries
 * enough to show the recent shape of a prompt and no more. */
const RAIL_SIZE = 5;

export const deploymentQueries = {
  forPrompt: (promptId: string) =>
    queryOptions({
      queryKey: deploymentKeys.forPrompt(promptId),
      queryFn: () => listDeployments({ limit: RAIL_SIZE, prompt: promptId }),
    }),
} as const;

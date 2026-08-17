import type { PlacementChange } from "@anpord/schema/domain/placements";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { applyPlacements } from "@/lib/placements-client";
import { deploymentKeys } from "@/lib/query/deployment-keys";
import { placementKeys } from "@/lib/query/placement-keys";
import { promptKeys } from "@/lib/query/prompt-keys";

/**
 * Moving channels writes a deployment and changes which version each list
 * calls live, so all three are invalidated together. Without it the grid keeps
 * showing what it served before the batch for as long as it stays fresh.
 */
export function useApplyPlacements() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (changes: readonly PlacementChange[]) =>
      applyPlacements({ changes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: placementKeys.all });
      queryClient.invalidateQueries({ queryKey: deploymentKeys.all });
      queryClient.invalidateQueries({ queryKey: promptKeys.all });
    },
  });
}

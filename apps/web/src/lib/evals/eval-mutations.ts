import { useMutation, useQueryClient } from "@tanstack/react-query";
import { evalKeys } from "@/lib/evals/eval-keys";
import { rerunCell } from "@/lib/evals/evals-client";

export const useRerunCell = (cellKey: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { readonly runId: string; readonly trials: number }) =>
      rerunCell(input.runId, cellKey, input.trials),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: evalKeys.lists() });
      queryClient.invalidateQueries({ queryKey: evalKeys.history(cellKey) });
    },
  });
};

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { evalKeys } from "@/lib/evals/eval-keys";
import { runCase } from "@/lib/evals/evals-client";

const TRIALS = 1;

export const useRunCase = (caseId: string, variant: string | null) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      runCase(caseId, {
        trials: TRIALS,
        ...(variant === null ? {} : { variant }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: evalKeys.caseLists() });
      queryClient.invalidateQueries({ queryKey: evalKeys.case(caseId) });
    },
  });
};

export type CaseRun = ReturnType<typeof useRunCase>;

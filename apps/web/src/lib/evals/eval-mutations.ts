import type { RerunRequest } from "@anpord/schema/domain/eval-rerun";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { evalKeys } from "@/lib/evals/eval-keys";
import { rerunSuite, runCase } from "@/lib/evals/evals-client";

const TRIALS = 1;

export const useRunCase = (caseId: string, variant: string | null) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      runCase(caseId, {
        trials: TRIALS,
        ...(variant === null ? {} : { variants: [variant] }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: evalKeys.caseLists() });
      queryClient.invalidateQueries({ queryKey: evalKeys.case(caseId) });
    },
  });
};

export const useRerunSuite = (suiteId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: RerunRequest) => rerunSuite(suiteId, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: evalKeys.caseLists() });
      queryClient.invalidateQueries({ queryKey: evalKeys.suite(suiteId) });
    },
  });
};

import type { StartedEval } from "@anpord/schema/domain/eval-playground";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { evalKeys } from "@/lib/evals/eval-keys";
import { rerunCase, rerunCell } from "@/lib/evals/evals-client";

const TRIALS = 1;

const useCaseRerun = (caseId: string, start: () => Promise<StartedEval>) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: start,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: evalKeys.caseLists() });
      queryClient.invalidateQueries({ queryKey: evalKeys.case(caseId) });
    },
  });
};

export const useRerunCase = (caseId: string) =>
  useCaseRerun(caseId, () => rerunCase(caseId, TRIALS));

export const useRerunCell = (
  caseId: string,
  variant: { readonly cellKey: string; readonly runId: string }
) =>
  useCaseRerun(caseId, () => rerunCell(variant.runId, variant.cellKey, TRIALS));

export type CaseRerun = ReturnType<typeof useRerunCase>;

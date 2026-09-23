import type { EvalCaseDetail } from "@anpord/schema/domain/evals";
import { useQuery } from "@tanstack/react-query";
import { evalQueries } from "@/lib/evals/eval-queries";

export const useCaseActivity = (
  detail: EvalCaseDetail,
  variant: string | null
) => {
  const filtered = useQuery({
    ...evalQueries.history(variant ?? ""),
    enabled: variant !== null,
    placeholderData: () =>
      detail.history.filter((entry) => entry.cellKey === variant),
  });

  return variant === null ? detail.history : (filtered.data ?? []);
};

import { useQuery } from "@tanstack/react-query";
import { evalQueries } from "@/lib/evals/eval-queries";
import { useCasePage } from "@/lib/evals/use-case-page";

export const useCaseRuns = (caseId: string, variant: string | null) => {
  const [page, setPage] = useCasePage();
  const { data, isPlaceholderData } = useQuery(
    evalQueries.caseRuns(caseId, variant, page)
  );

  return { onPage: setPage, paging: isPlaceholderData, runs: data };
};

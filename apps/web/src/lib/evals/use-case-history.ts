import { useQuery } from "@tanstack/react-query";
import { evalQueries } from "@/lib/evals/eval-queries";
import { useCasePage } from "@/lib/evals/use-case-page";

export const useCaseHistory = (caseId: string, cellKey: string | null) => {
  const [page, setPage] = useCasePage();
  const { data, isPlaceholderData } = useQuery(
    evalQueries.caseHistory(caseId, cellKey, page)
  );

  return { history: data, onPage: setPage, paging: isPlaceholderData };
};

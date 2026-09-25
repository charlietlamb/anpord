import type { EvalPageCursor } from "@anpord/schema/domain/evals";
import { useQuery } from "@tanstack/react-query";
import { PLACEHOLDER_CASE_PAGE } from "@/lib/evals/eval-placeholders";
import { evalQueries } from "@/lib/evals/eval-queries";
import type { CaseFilters } from "@/lib/evals/evals-client";
import { pagingOf, useCursorStack } from "@/lib/use-cursor-stack";

export function useCaseList(filters: CaseFilters) {
  const pages = useCursorStack<EvalPageCursor>();
  const { data, error, isPending, isPlaceholderData } = useQuery(
    evalQueries.cases(filters, pages.cursor)
  );
  const page = data ?? PLACEHOLDER_CASE_PAGE;

  return {
    cases: page.cases,
    error,
    loading: isPending,
    paging: pagingOf(pages, page.next, isPlaceholderData),
    reset: pages.reset,
    suites: page.suites,
    tags: page.tags,
  };
}

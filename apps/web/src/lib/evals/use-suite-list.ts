import type { EvalPageCursor } from "@anpord/schema/domain/evals";
import { useQuery } from "@tanstack/react-query";
import { PLACEHOLDER_SUITE_PAGE } from "@/lib/evals/eval-placeholders";
import { evalQueries } from "@/lib/evals/eval-queries";
import { pagingOf, useCursorStack } from "@/lib/use-cursor-stack";

export function useSuiteList() {
  const pages = useCursorStack<EvalPageCursor>();
  const { data, error, isPending, isPlaceholderData } = useQuery(
    evalQueries.suites(pages.cursor)
  );
  const page = data ?? PLACEHOLDER_SUITE_PAGE;

  return {
    error,
    loading: isPending,
    paging: pagingOf(pages, page.next, isPlaceholderData),
    suites: page.suites,
  };
}

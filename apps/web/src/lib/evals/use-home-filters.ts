import { useQueryStates } from "nuqs";
import type { HomeFilters } from "@/lib/evals/home-view";
import { homeParsers } from "@/lib/query/home-filters";

export function useHomeFilters() {
  const [params, setParams] = useQueryStates(homeParsers);
  const filters: HomeFilters = {
    range: params.range,
    reason: params.reason || null,
    suite: params.suite || null,
    variant: params.variant || null,
    verdict: params.verdict,
  };
  const setFilters = (changed: Partial<HomeFilters>) =>
    setParams({
      ...changed,
      reason: changed.reason === undefined ? undefined : (changed.reason ?? ""),
      suite: changed.suite === undefined ? undefined : (changed.suite ?? ""),
      variant:
        changed.variant === undefined ? undefined : (changed.variant ?? ""),
    });
  return [filters, setFilters] as const;
}

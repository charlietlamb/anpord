import { Button } from "@anpord/ui/components/button";
import { PlusIcon } from "@phosphor-icons/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryStates } from "nuqs";
import { CaseFilterMenu } from "@/components/evals/case-filter-menu";
import { CaseList } from "@/components/evals/case-list";
import { PageShell } from "@/components/layout/page-shell";
import { SearchInput } from "@/components/layout/search-input";
import { SortMenu } from "@/components/layout/sort-menu";
import { evalQueries } from "@/lib/evals/eval-queries";
import { useCaseList } from "@/lib/evals/use-case-list";
import {
  CASE_SORT_OPTIONS,
  caseListParsers,
} from "@/lib/query/case-list-filters";

export const Route = createFileRoute("/_authed/evals/")({
  ssr: false,
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(
      evalQueries.cases({
        order: "desc",
        q: null,
        sort: "recent",
        suite: null,
        tag: null,
      })
    );
  },
  component: EvalsIndex,
});

function EvalsIndex() {
  const [filters, setFilters] = useQueryStates(caseListParsers);
  const selected = {
    order: filters.order,
    q: filters.q.trim() || null,
    sort: filters.sort,
    suite: filters.suite || null,
    tag: filters.tag || null,
  };
  const { cases, error, loading, paging, reset, suites, tags } =
    useCaseList(selected);

  const narrow = (changed: Partial<typeof filters>) => {
    reset();
    setFilters(changed);
  };

  return (
    <PageShell title="Evals" width="wide">
      <div className="flex flex-wrap items-center gap-2">
        <SortMenu
          direction={filters.order}
          onChange={(sort) => narrow({ sort })}
          onDirection={(order) => narrow({ order })}
          options={CASE_SORT_OPTIONS}
          value={filters.sort}
        />
        <CaseFilterMenu
          onClear={() => narrow({ suite: "", tag: "" })}
          onSuite={(suite) => narrow({ suite: suite ?? "" })}
          onTag={(tag) => narrow({ tag: tag ?? "" })}
          suite={selected.suite}
          suites={suites}
          tag={selected.tag}
          tags={tags}
        />
        <SearchInput
          className="w-full"
          grow
          label="Search cases"
          onChange={(q) => narrow({ q })}
          value={filters.q}
        />
        <Button render={<Link to="/evals/new" />}>
          <PlusIcon />
          New eval
        </Button>
      </div>

      <CaseList
        cases={cases}
        error={error}
        loading={loading}
        narrowed={Object.values(selected).some((value) => value !== null)}
        paging={paging}
      />
    </PageShell>
  );
}

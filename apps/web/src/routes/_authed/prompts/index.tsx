import { buttonVariants } from "@anpord/ui/lib/button-variants";
import { cn } from "@anpord/ui/lib/utils";
import { PlusIcon } from "@phosphor-icons/react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { parseAsString, parseAsStringLiteral, useQueryState } from "nuqs";
import { PromptFilterButton } from "@/components/prompts/prompt-filter-button";
import { PromptSearch } from "@/components/prompts/prompt-search";
import { PromptsBody } from "@/components/prompts/prompts-body";
import type { PromptListFilters } from "@/lib/query/prompt-list-filters";
import { promptQueries } from "@/lib/query/prompt-queries";

/** Long enough that typing a word is one request rather than five, short
 * enough that the list still feels like it is following along. */
const SEARCH_THROTTLE_MS = 250;

const STATUS_OPTIONS = [
  { label: "All prompts", value: "all" },
  { label: "Live", value: "live" },
  { label: "Draft", value: "draft" },
] as const;

const SORT_OPTIONS = [
  { label: "Recently updated", value: "updated" },
  { label: "Name", value: "name" },
] as const;

type Status = (typeof STATUS_OPTIONS)[number]["value"];
type Sort = (typeof SORT_OPTIONS)[number]["value"];

const DEFAULT_STATUS: Status = "all";
const DEFAULT_SORT: Sort = "updated";

const filtersFrom = (search: Record<string, unknown>): PromptListFilters => ({
  search: typeof search.q === "string" ? search.q : "",
  sort: SORT_OPTIONS.some((option) => option.value === search.sort)
    ? (search.sort as Sort)
    : DEFAULT_SORT,
  status: STATUS_OPTIONS.some((option) => option.value === search.status)
    ? (search.status as Status)
    : DEFAULT_STATUS,
});

export const Route = createFileRoute("/_authed/prompts/")({
  component: PromptsPage,
  loaderDeps: ({ search }) => filtersFrom(search),
  loader: async ({ context, deps }) => {
    const { promptQueries: queries } = await import(
      "@/lib/query/prompt-queries"
    );
    return context.queryClient.ensureInfiniteQueryData(queries.list(deps));
  },
});

/** Fetched on the client: the list is session-scoped and needs the cookie. */
function PromptsPage() {
  const [search, setSearch] = useQueryState(
    "q",
    parseAsString
      .withDefault("")
      .withOptions({ clearOnDefault: true, throttleMs: SEARCH_THROTTLE_MS })
  );

  const [status, setStatus] = useQueryState(
    "status",
    parseAsStringLiteral(STATUS_OPTIONS.map((option) => option.value))
      .withDefault(DEFAULT_STATUS)
      .withOptions({ clearOnDefault: true })
  );

  const [sort, setSort] = useQueryState(
    "sort",
    parseAsStringLiteral(SORT_OPTIONS.map((option) => option.value))
      .withDefault(DEFAULT_SORT)
      .withOptions({ clearOnDefault: true })
  );

  const query = useInfiniteQuery(promptQueries.list({ search, sort, status }));
  const prompts = query.data?.pages.flatMap((page) => page.items);

  const filtered = status !== DEFAULT_STATUS || sort !== DEFAULT_SORT;

  const clearFilters = () => {
    setStatus(DEFAULT_STATUS);
    setSort(DEFAULT_SORT);
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col overflow-y-auto px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl tracking-tight">Prompts</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Version and deploy the prompts your application runs on.
          </p>
        </div>
        <Link
          className={cn(buttonVariants({ size: "sm" }), "shrink-0")}
          to="/prompts/new"
        >
          <PlusIcon weight="bold" />
          New prompt
        </Link>
      </div>

      <div className="mt-6 flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <PromptSearch onChange={setSearch} value={search} />
        </div>
        <PromptFilterButton
          active={filtered}
          onClear={clearFilters}
          onSortChange={setSort}
          onStatusChange={setStatus}
          sort={sort}
          sortOptions={SORT_OPTIONS}
          status={status}
          statusOptions={STATUS_OPTIONS}
        />
      </div>

      <PromptsBody
        error={query.error}
        hasMore={query.hasNextPage}
        isPending={query.isPending}
        loadingMore={query.isFetchingNextPage}
        onLoadMore={() => query.fetchNextPage()}
        prompts={prompts}
        search={search}
      />
    </div>
  );
}

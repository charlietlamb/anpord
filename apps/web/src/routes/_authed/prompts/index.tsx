import { buttonVariants } from "@anpord/ui/lib/button-variants";
import { cn } from "@anpord/ui/lib/utils";
import { PlusIcon } from "@phosphor-icons/react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { parseAsString, parseAsStringLiteral, useQueryState } from "nuqs";
import { ListState } from "@/components/layout/list-state";
import { PageShell } from "@/components/layout/page-shell";
import { PromptFilterButton } from "@/components/prompts/prompt-filter-button";
import { PromptList } from "@/components/prompts/prompt-list";
import { PromptListSkeleton } from "@/components/prompts/prompt-list-skeleton";
import { PromptSearch } from "@/components/prompts/prompt-search";
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
  loaderDeps: ({ search }) => filtersFrom(search),
  /** The client fetches these: the API is addressed relatively, which has no
   * base on the server, and the session cookie is the browser's to send. */
  ssr: false,
  loader: async ({ context, deps }) => {
    const { promptQueries: queries } = await import(
      "@/lib/query/prompt-queries"
    );
    return context.queryClient.ensureInfiniteQueryData(queries.list(deps));
  },
  component: PromptsPage,
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
    <PageShell
      actions={
        <>
          <PromptSearch onChange={setSearch} value={search} />
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
          <Link
            className={cn(buttonVariants({ size: "sm" }))}
            to="/prompts/new"
          >
            <PlusIcon weight="bold" />
            New prompt
          </Link>
        </>
      }
    >
      <ListState
        action={
          search ? null : (
            <Link
              className={cn(buttonVariants({ size: "sm" }))}
              to="/prompts/new"
            >
              <PlusIcon weight="bold" />
              New prompt
            </Link>
          )
        }
        description={
          search
            ? `Nothing matches “${search}”.`
            : "Create one to start versioning what your application sends."
        }
        empty={prompts?.length === 0}
        error={query.error}
        isPending={query.isPending}
        skeleton={<PromptListSkeleton />}
        title={search ? "No matching prompts" : "No prompts yet"}
      >
        <PromptList
          hasMore={query.hasNextPage}
          loadingMore={query.isFetchingNextPage}
          onLoadMore={() => query.fetchNextPage()}
          prompts={prompts ?? []}
        />
      </ListState>
    </PageShell>
  );
}

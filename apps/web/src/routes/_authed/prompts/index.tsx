import { Button } from "@anpord/ui/components/button";
import { DataTableSkeleton } from "@anpord/ui/components/ui/data-table";
import {
  ChatTextIcon,
  MagnifyingGlassIcon,
  PlusIcon,
} from "@phosphor-icons/react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryStates } from "nuqs";
import { ListState } from "@/components/layout/list-state";
import { PageShell } from "@/components/layout/page-shell";
import { PromptList } from "@/components/prompts/prompt-list";
import { PromptSearch } from "@/components/prompts/prompt-search";
import { PromptSortMenu } from "@/components/prompts/prompt-sort-menu";
import { PROMPTS_TABLE } from "@/lib/prompts/prompt-tables";
import {
  loadPromptListFilters,
  PROMPT_SORT_OPTIONS,
  promptListParsers,
} from "@/lib/query/prompt-list-filters";
import { promptQueries } from "@/lib/query/prompt-queries";

export const Route = createFileRoute("/_authed/prompts/")({
  loaderDeps: ({ search }) =>
    loadPromptListFilters(
      Object.fromEntries(
        Object.entries(search).map(([key, value]) => [key, String(value)])
      )
    ),
  ssr: false,
  loader: async ({ context, deps }) => {
    const { promptQueries: queries } = await import(
      "@/lib/query/prompt-queries"
    );
    return context.queryClient.ensureInfiniteQueryData(queries.list(deps));
  },
  component: PromptsPage,
});

const emptyCopy = (search: string) =>
  search
    ? {
        description: `Nothing matches “${search}”.`,
        icon: <MagnifyingGlassIcon />,
        title: "No matching prompts",
      }
    : {
        description:
          "Create one to start versioning what your application sends.",
        icon: <ChatTextIcon />,
        title: "No prompts yet",
      };

function PromptsPage() {
  const [filters, setFilters] = useQueryStates(promptListParsers);
  const query = useInfiniteQuery(promptQueries.list(filters));
  const prompts = query.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <PageShell
      actions={
        <>
          <PromptSearch onChange={(q) => setFilters({ q })} value={filters.q} />
          <PromptSortMenu
            onChange={(sort) => setFilters({ sort })}
            options={PROMPT_SORT_OPTIONS}
            value={filters.sort}
          />
          <Button render={<Link to="/prompts/new" />} size="sm">
            <PlusIcon />
            New prompt
          </Button>
        </>
      }
      title="Prompts"
      width="wide"
    >
      <ListState
        {...emptyCopy(filters.q)}
        empty={prompts.length === 0}
        error={query.error}
        isPending={query.isPending}
        skeleton={<DataTableSkeleton {...PROMPTS_TABLE} />}
      >
        <PromptList
          hasMore={query.hasNextPage}
          loadingMore={query.isFetchingNextPage}
          onLoadMore={() => query.fetchNextPage()}
          prompts={prompts}
        />
      </ListState>
    </PageShell>
  );
}

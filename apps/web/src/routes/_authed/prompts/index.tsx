import { Button } from "@anpord/ui/components/button";
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
import { SearchInput } from "@/components/layout/search-input";
import { SortMenu } from "@/components/layout/sort-menu";
import { PromptList } from "@/components/prompts/prompt-list";
import { PLACEHOLDER_PROMPTS } from "@/lib/prompts/prompt-placeholders";
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
          <SearchInput
            label="Search prompts"
            onChange={(q) => setFilters({ q })}
            value={filters.q}
          />
          <SortMenu
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
        loading={query.isPending}
      >
        <PromptList
          hasMore={query.hasNextPage}
          loadingMore={query.isFetchingNextPage}
          onLoadMore={() => query.fetchNextPage()}
          prompts={query.isPending ? PLACEHOLDER_PROMPTS : prompts}
        />
      </ListState>
    </PageShell>
  );
}

import type { EvalPageCursor } from "@anpord/schema/domain/evals";
import { Button } from "@anpord/ui/components/button";
import { FlaskIcon, PlusIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CasesTable } from "@/components/evals/cases-table";
import { SuiteTabs } from "@/components/evals/suite-tabs";
import { TagSelect } from "@/components/evals/tag-select";
import { CursorPagination } from "@/components/layout/cursor-pagination";
import { ListState } from "@/components/layout/list-state";
import { PageShell } from "@/components/layout/page-shell";
import { PLACEHOLDER_CASE_PAGE } from "@/lib/evals/eval-placeholders";
import { evalQueries } from "@/lib/evals/eval-queries";
import { useCursorStack } from "@/lib/use-cursor-stack";

export const Route = createFileRoute("/_authed/evals/")({
  validateSearch: (search): { suite?: string; tag?: string } => ({
    ...(typeof search.suite === "string" && search.suite !== ""
      ? { suite: search.suite }
      : {}),
    ...(typeof search.tag === "string" && search.tag !== ""
      ? { tag: search.tag }
      : {}),
  }),
  ssr: false,
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(
      evalQueries.cases({ suite: null, tag: null })
    );
  },
  component: EvalsIndex,
});

function EvalsIndex() {
  const navigate = Route.useNavigate();
  const { suite = null, tag = null } = Route.useSearch();
  const pages = useCursorStack<EvalPageCursor>();
  const { data, error, isPending, isPlaceholderData } = useQuery(
    evalQueries.cases({ suite, tag }, pages.cursor)
  );
  const page = data ?? PLACEHOLDER_CASE_PAGE;
  const { cases, next } = page;

  return (
    <PageShell
      actions={
        <>
          <TagSelect
            onSelect={(selected) => {
              pages.reset();
              navigate({
                search: (current) => ({
                  ...current,
                  tag: selected ?? undefined,
                }),
              });
            }}
            selected={tag}
            tags={page.tags}
          />
          <Button render={<Link to="/evals/new" />} size="sm">
            <PlusIcon />
            New eval
          </Button>
        </>
      }
      tabs={
        <SuiteTabs
          onSelect={(selected) => {
            pages.reset();
            navigate({
              search: (current) => ({
                ...current,
                suite: selected ?? undefined,
              }),
            });
          }}
          selected={suite}
          suites={page.suites}
        />
      }
      title="Evals"
      width="wide"
    >
      <ListState
        description="Run an eval and the cases it measures appear here."
        empty={cases.length === 0}
        error={error}
        icon={<FlaskIcon />}
        loading={isPending}
        title={tag === null ? "No cases yet" : `Nothing tagged ${tag}`}
      >
        <CasesTable
          cases={cases}
          pagination={
            <CursorPagination
              canGoNext={next !== null}
              canGoPrev={pages.page > 1}
              disabled={isPlaceholderData}
              onNext={() => {
                if (next !== null) {
                  pages.push(next);
                }
              }}
              onPrev={pages.pop}
              page={pages.page}
            />
          }
        />
      </ListState>
    </PageShell>
  );
}

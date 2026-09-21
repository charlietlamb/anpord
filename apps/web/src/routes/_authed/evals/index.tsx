import type { EvalPageCursor } from "@anpord/schema/domain/evals";
import { EVAL_PAGE_SIZE } from "@anpord/schema/domain/evals";
import { Button } from "@anpord/ui/components/button";
import { PageHeading } from "@anpord/ui/components/ui/page-heading";
import {
  type PageTabOption,
  PageTabs,
} from "@anpord/ui/components/ui/page-tabs";
import {
  ClockCounterClockwiseIcon,
  FlaskIcon,
  ListChecksIcon,
  PlusIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { CaseRow } from "@/components/evals/case-row";
import { EvalRow } from "@/components/evals/eval-row";
import { EvalListSkeleton } from "@/components/evals/eval-row-skeleton";
import { TagFilter } from "@/components/evals/tag-filter";
import { CursorPagination } from "@/components/layout/cursor-pagination";
import { ListState } from "@/components/layout/list-state";
import { PageShell } from "@/components/layout/page-shell";
import { RowList } from "@/components/layout/row-list";
import { evalQueries } from "@/lib/evals/eval-queries";
import { useCursorStack } from "@/lib/use-cursor-stack";

type EvalsView = "cases" | "runs";

export const Route = createFileRoute("/_authed/evals/")({
  ssr: false,
  /* Not returned, so the list paints its skeleton rather than holding the
     navigation until the first page of runs arrives. */
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(evalQueries.list(null));
  },
  component: EvalsIndex,
  /* In the url rather than in state: which view and which tag is what a
     reader shares and returns to, and a refresh should not lose it. */
  validateSearch: (search): { tag?: string; view?: EvalsView } => ({
    ...(typeof search.tag === "string" && search.tag !== ""
      ? { tag: search.tag }
      : {}),
    ...(search.view === "runs" ? { view: "runs" as const } : {}),
  }),
});

const VIEWS: readonly PageTabOption<EvalsView>[] = [
  { Icon: ListChecksIcon, label: "Cases", value: "cases" },
  { Icon: ClockCounterClockwiseIcon, label: "Runs", value: "runs" },
];

/* Matches the detail screens, so opening a row does not change the page width. */
function EvalsIndex() {
  const navigate = Route.useNavigate();
  const { tag = null, view = "cases" } = Route.useSearch();
  const { cursor, page, pop, push } = useCursorStack<EvalPageCursor>();
  const { data, error, isFetching, isPending } = useQuery(
    evalQueries.list(cursor)
  );
  const cases = useQuery(evalQueries.cases(tag));

  const runs = data?.runs ?? [];
  const next = data?.next ?? null;
  const total = data?.total ?? 0;

  const pagination = (
    <CursorPagination
      canGoNext={next !== null}
      canGoPrev={page > 1}
      disabled={isFetching}
      onNext={() => next !== null && push(next)}
      onPrev={pop}
      page={page}
      pages={Math.max(1, Math.ceil(total / EVAL_PAGE_SIZE))}
    />
  );

  const newEval = (
    <Button render={<Link to="/evals/new" />} size="sm">
      <PlusIcon className="size-3.5" />
      New eval
    </Button>
  );

  return (
    <PageShell
      actions={
        <span className="flex items-center gap-2">
          {view === "runs" ? pagination : null}
          {newEval}
        </span>
      }
      leading={<PageHeading icon={FlaskIcon} title="Evals" />}
      tabs={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <PageTabs
            onChange={(next) => navigate({ search: { view: next } })}
            options={VIEWS}
            value={view}
          />
          {view === "cases" ? (
            <TagFilter
              onSelect={(next) =>
                navigate({ search: { tag: next ?? undefined, view } })
              }
              selected={tag}
              tags={cases.data?.tags ?? []}
            />
          ) : null}
        </div>
      }
      width="wide"
    >
      {view === "cases" ? (
        <ListState
          description="Run an eval and the cases it measures appear here."
          empty={(cases.data?.cases.length ?? 0) === 0}
          error={cases.error}
          icon={<FlaskIcon size={20} />}
          isPending={cases.isPending}
          skeleton={<EvalListSkeleton />}
          title={tag === null ? "No cases yet" : `Nothing tagged ${tag}`}
        >
          <RowList>
            {(cases.data?.cases ?? []).map((subject) => (
              <CaseRow key={subject.cellKey} subject={subject} />
            ))}
          </RowList>
        </ListState>
      ) : (
        <ListState
          action={
            <Button
              render={<Link to="/evals/new" />}
              size="sm"
              variant="outline"
            >
              <PlusIcon className="size-3.5" />
              New eval
            </Button>
          }
          description="Run one to see how a harness behaves on a case you care about."
          empty={runs.length === 0}
          error={error}
          icon={<FlaskIcon size={20} />}
          isPending={isPending}
          skeleton={<EvalListSkeleton />}
          title="No evals yet"
        >
          <RowList>
            {runs.map((run) => (
              <EvalRow key={run.id} run={run} />
            ))}
          </RowList>
        </ListState>
      )}
    </PageShell>
  );
}

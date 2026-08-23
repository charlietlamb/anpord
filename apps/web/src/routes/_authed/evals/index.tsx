import type { EvalPageCursor } from "@anpord/schema/domain/evals";
import { Button } from "@anpord/ui/components/button";
import { PageHeading } from "@anpord/ui/components/ui/page-heading";
import { FlaskIcon, PlusIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { EvalListSkeleton } from "@/components/evals/eval-list-skeleton";
import { EvalRow } from "@/components/evals/eval-row";
import { CursorPagination } from "@/components/layout/cursor-pagination";
import { ListState } from "@/components/layout/list-state";
import { PageShell } from "@/components/layout/page-shell";
import { RowList } from "@/components/layout/row-list";
import { evalQueries } from "@/lib/evals/eval-queries";
import { useCursorStack } from "@/lib/use-cursor-stack";

export const Route = createFileRoute("/_authed/evals/")({
  ssr: false,
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(evalQueries.list(null)),
  component: EvalsIndex,
});

/* Wide, matching the detail screens: a list that changes the page width when
   a row is opened makes every navigation feel like a reload. */
function EvalsIndex() {
  const { cursor, page, pop, push } = useCursorStack<EvalPageCursor>();
  const { data, error, isFetching, isPending } = useQuery(
    evalQueries.list(cursor)
  );

  const runs = data?.runs ?? [];
  const next = data?.next ?? null;

  const pagination = (
    <CursorPagination
      canGoNext={next !== null}
      canGoPrev={page > 1}
      disabled={isFetching}
      onNext={() => next !== null && push(next)}
      onPrev={pop}
      page={page}
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
          {pagination}
          {newEval}
        </span>
      }
      leading={<PageHeading icon={FlaskIcon} title="Evals" />}
      width="wide"
    >
      <ListState
        action={newEval}
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
    </PageShell>
  );
}

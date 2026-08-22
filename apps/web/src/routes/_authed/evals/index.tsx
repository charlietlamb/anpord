import { Button } from "@anpord/ui/components/button";
import { PageHeading } from "@anpord/ui/components/ui/page-heading";
import { FlaskIcon, PlusIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { EvalListSkeleton } from "@/components/evals/eval-list-skeleton";
import { EvalRow } from "@/components/evals/eval-row";
import { ListState } from "@/components/layout/list-state";
import { PageShell } from "@/components/layout/page-shell";
import { evalQueries } from "@/lib/evals/eval-queries";

export const Route = createFileRoute("/_authed/evals/")({
  component: EvalsIndex,
});

/* Wide, matching the detail screens: a list that changes the page width when
   a row is opened makes every navigation feel like a reload. */
function EvalsIndex() {
  const { data, error, isPending } = useQuery(evalQueries.list());
  const runs = data ?? [];

  const newEval = (
    <Button render={<Link to="/evals/new" />} size="sm">
      <PlusIcon className="size-3.5" />
      New eval
    </Button>
  );

  return (
    <PageShell
      actions={newEval}
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
        <div className="-mx-2 flex flex-col">
          {runs.map((run) => (
            <EvalRow key={run.id} run={run} />
          ))}
        </div>
      </ListState>
    </PageShell>
  );
}

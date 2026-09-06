import { PageHeading } from "@anpord/ui/components/ui/page-heading";
import { FlaskIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CellRail } from "@/components/evals/cell-rail";
import { CellSetup } from "@/components/evals/cell-setup";
import { CellSkeleton } from "@/components/evals/cell-skeleton";
import { EvalLayout, EvalMain } from "@/components/evals/eval-layout";
import { RerunCellButton } from "@/components/evals/rerun-cell-button";
import { TrialTable } from "@/components/evals/trial-table";
import { ErrorCard } from "@/components/layout/error-card";
import { evalQueries } from "@/lib/evals/eval-queries";

export const Route = createFileRoute("/_authed/evals/$runId/cells/$cellKey/")({
  component: CellScreen,
  ssr: false,
  /* Not returned: the run this screen renders from is already ensured by the
     parent, so history streams in rather than holding the navigation. */
  loader: ({ context, params }) => {
    context.queryClient.prefetchQuery(evalQueries.history(params.cellKey));
  },
});

function CellScreen() {
  const { cellKey, runId } = Route.useParams();
  const { data: run } = useQuery(evalQueries.detail(runId));

  const cell = run?.cells.find((candidate) => candidate.cellKey === cellKey);

  if (run === undefined) {
    return <CellSkeleton cellKey={cellKey} runId={runId} />;
  }

  if (cell === undefined) {
    return (
      <ErrorCard
        description="This run has no cell with that key."
        title="Could not find this cell"
      />
    );
  }

  return (
    <EvalLayout>
      <EvalMain>
        <section className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-3">
            <PageHeading icon={FlaskIcon} title={cell.caseName} />
            <RerunCellButton
              cellKey={cellKey}
              runId={runId}
              trials={cell.trials.length}
            />
          </div>

          <TrialTable cellKey={cellKey} runId={runId} trials={cell.trials} />
        </section>

        {cell.setup === null ? null : (
          <CellSetup setup={cell.setup} trials={cell.trials} />
        )}
      </EvalMain>

      <CellRail
        cell={cell}
        cellKey={cellKey}
        runId={runId}
        task={run.tasks[cell.taskIndex]}
        trigger={run.trigger}
      />
    </EvalLayout>
  );
}

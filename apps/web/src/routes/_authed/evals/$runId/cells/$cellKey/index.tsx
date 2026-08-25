import { PageHeading } from "@anpord/ui/components/ui/page-heading";
import { FlaskIcon, SlidersHorizontalIcon } from "@phosphor-icons/react";
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
  loader: ({ context, params }) =>
    context.queryClient.prefetchQuery(evalQueries.history(params.cellKey)),
});

function CellScreen() {
  const { cellKey, runId } = Route.useParams();
  const { data: run } = useQuery(evalQueries.detail(runId));
  const { data: readings } = useQuery(evalQueries.history(cellKey));

  const cell = run?.cells.find((candidate) => candidate.cellKey === cellKey);

  if (run === undefined) {
    return <CellSkeleton cellKey={cellKey} runId={runId} />;
  }

  /* Loaded, and no such cell in it. A skeleton here would wait forever for
     something the run does not contain. */
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

          <TrialTable cellKey={cellKey} readings={readings ?? []} />
        </section>

        {cell.setup === null ? null : (
          <section className="flex flex-col gap-1.5">
            <PageHeading icon={SlidersHorizontalIcon} title="Setup" />
            <CellSetup setup={cell.setup} trials={cell.trials} />
          </section>
        )}
      </EvalMain>

      <CellRail
        cell={cell}
        cellKey={cellKey}
        task={run.tasks[cell.taskIndex]}
      />
    </EvalLayout>
  );
}

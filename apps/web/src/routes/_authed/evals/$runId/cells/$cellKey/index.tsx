import { PageHeading } from "@anpord/ui/components/ui/page-heading";
import { FlaskIcon, SlidersHorizontalIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CellRail } from "@/components/evals/cell-rail";
import { CellSetup } from "@/components/evals/cell-setup";
import { EvalLayout, EvalMain } from "@/components/evals/eval-layout";
import { RerunCellButton } from "@/components/evals/rerun-cell-button";
import { TrialTable } from "@/components/evals/trial-table";
import { evalQueries } from "@/lib/evals/eval-queries";

export const Route = createFileRoute("/_authed/evals/$runId/cells/$cellKey/")({
  component: CellScreen,
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(evalQueries.history(params.cellKey)),
});

function CellScreen() {
  const { cellKey, runId } = Route.useParams();
  const { data: run } = useQuery(evalQueries.detail(runId));
  const { data: readings } = useQuery(evalQueries.history(cellKey));

  const cell = run?.cells.find((candidate) => candidate.cellKey === cellKey);

  if (run === undefined || cell === undefined) {
    return null;
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
            <CellSetup setup={cell.setup} />
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

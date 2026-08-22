import { FlaskIcon, SlidersHorizontalIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CellRail } from "@/components/evals/cell-rail";
import { CellSetup } from "@/components/evals/cell-setup";
import { EvalLayout, EvalMain } from "@/components/evals/eval-layout";
import { TrialTable } from "@/components/evals/trial-table";
import { PageHeading } from "@/components/layout/page-heading";
import { evalQueries } from "@/lib/evals/eval-queries";

export const Route = createFileRoute("/_authed/evals/$runId/cells/$cellKey/")({
  component: CellScreen,
});

function CellScreen() {
  const { cellKey, runId } = Route.useParams();
  const { data: run } = useQuery(evalQueries.detail(runId));

  const cell = run?.cells.find((candidate) => candidate.cellKey === cellKey);

  if (run === undefined || cell === undefined) {
    return null;
  }

  return (
    <EvalLayout>
      <EvalMain>
        <section className="flex flex-col gap-1.5">
          <PageHeading icon={FlaskIcon} title={cell.caseName} />
          <TrialTable cellKey={cellKey} runId={runId} trials={cell.trials} />
        </section>

        {/* Under the readings rather than over them: the score is what the
            screen is for, and the rubric is what you open when it surprises
            you. */}
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

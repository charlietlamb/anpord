import { PageHeading } from "@anpord/ui/components/ui/page-heading";
import { SquaresFourIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CellRow } from "@/components/evals/cell-row";
import { CellVerdictNote } from "@/components/evals/cell-verdict-note";
import { EvalLayout, EvalMain } from "@/components/evals/eval-layout";
import { RunRail } from "@/components/evals/run-rail";
import { VariantComparison } from "@/components/evals/variant-comparison";
import { EmptyNote } from "@/components/layout/empty-note";
import { ErrorCard } from "@/components/layout/error-card";
import { RowList } from "@/components/layout/row-list";
import { evalQueries } from "@/lib/evals/eval-queries";

export const Route = createFileRoute("/_authed/evals/$runId/")({
  component: EvalRunScreen,
});

function EvalRunScreen() {
  const { runId } = Route.useParams();
  const { data: run, error } = useQuery(evalQueries.detail(runId));

  if (error) {
    return (
      <ErrorCard description={error.message} title="Could not load this run" />
    );
  }

  if (run === undefined) {
    return null;
  }

  return (
    <EvalLayout>
      <EvalMain>
        <VariantComparison cells={run.cells} tasks={run.tasks} />

        <section className="flex flex-col gap-1.5">
          <PageHeading icon={SquaresFourIcon} title="Cases" />

          {run.cells.length === 0 ? (
            <EmptyNote>
              {run.status === "running"
                ? "Setting up. The grid appears as its squares register."
                : "This run recorded no cells."}
            </EmptyNote>
          ) : (
            <RowList>
              {run.cells.map((cell) => (
                <div key={cell.cellKey ?? `${cell.caseName}-${cell.taskIndex}`}>
                  <CellRow
                    cell={cell}
                    runId={run.id}
                    task={run.tasks[cell.taskIndex]}
                  />
                  <CellVerdictNote cell={cell} />
                </div>
              ))}
            </RowList>
          )}
        </section>
      </EvalMain>

      <RunRail run={run} />
    </EvalLayout>
  );
}

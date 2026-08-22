import { SquaresFourIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CellRow, CellVerdictNote } from "@/components/evals/cell-row";
import { EvalLayout, EvalMain } from "@/components/evals/eval-layout";
import { RunRail } from "@/components/evals/run-rail";
import { ErrorCard } from "@/components/layout/error-card";
import { PageHeading } from "@/components/layout/page-heading";
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
        <section className="flex flex-col gap-1.5">
          <PageHeading icon={SquaresFourIcon} title="Cases" />

          {run.cells.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground text-xs">
              This run recorded no cells.
            </p>
          ) : (
            <div className="-mx-2 flex flex-col">
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
            </div>
          )}
        </section>
      </EvalMain>

      <RunRail run={run} />
    </EvalLayout>
  );
}

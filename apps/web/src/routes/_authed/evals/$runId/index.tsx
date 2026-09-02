import { PageHeading } from "@anpord/ui/components/ui/page-heading";
import { SquaresFourIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { EvalLayout, EvalMain } from "@/components/evals/eval-layout";
import { RunGrid } from "@/components/evals/run-grid";
import { RunRail } from "@/components/evals/run-rail";
import { RunSkeleton } from "@/components/evals/run-skeleton";
import { EmptyNote } from "@/components/layout/empty-note";
import { ErrorCard } from "@/components/layout/error-card";
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
    return <RunSkeleton runId={runId} />;
  }

  return (
    <EvalLayout>
      <EvalMain>
        <section className="flex flex-col gap-1.5">
          <PageHeading icon={SquaresFourIcon} title="Cases" />

          {run.cells.length === 0 ? (
            <EmptyNote>
              {run.status === "running"
                ? "Setting up. The grid appears as its squares register."
                : "This run recorded no cells."}
            </EmptyNote>
          ) : (
            <RunGrid run={run} />
          )}
        </section>
      </EvalMain>

      <RunRail run={run} />
    </EvalLayout>
  );
}

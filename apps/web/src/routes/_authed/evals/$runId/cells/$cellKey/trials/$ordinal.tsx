import { PageHeading } from "@anpord/ui/components/ui/page-heading";
import { PulseIcon, SlidersHorizontalIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CellSetup } from "@/components/evals/cell-setup";
import { EvalLayout, EvalMain } from "@/components/evals/eval-layout";
import { TokenBand } from "@/components/evals/token-band";
import { TrialRail } from "@/components/evals/trial-rail";
import { TrialSkeleton } from "@/components/evals/trial-skeleton";
import { Waterfall } from "@/components/evals/waterfall";
import { ErrorCard } from "@/components/layout/error-card";
import { evalQueries } from "@/lib/evals/eval-queries";

export const Route = createFileRoute(
  "/_authed/evals/$runId/cells/$cellKey/trials/$ordinal"
)({
  component: TrialScreen,
  staticData: {
    crumb: (params: Record<string, string>) => `trial ${params.ordinal}`,
  },
});

function TrialScreen() {
  const { cellKey, ordinal, runId } = Route.useParams();
  const { data: run } = useQuery(evalQueries.detail(runId));

  const cell = run?.cells.find((candidate) => candidate.cellKey === cellKey);
  const trial = cell?.trials.find(
    (candidate) => String(candidate.ordinal) === ordinal
  );

  if (run === undefined) {
    return <TrialSkeleton />;
  }

  /* Loaded, and no such trial in it. Waiting on something the run does not
     hold would leave the reader watching an empty page forever. */
  if (trial === undefined) {
    return (
      <ErrorCard
        description="This cell has no trial with that number."
        title="Could not find this trial"
      />
    );
  }

  return (
    <EvalLayout>
      <EvalMain>
        <section className="flex flex-col gap-1.5">
          <PageHeading icon={PulseIcon} title="Trajectory" />

          {/* Above the waterfall and on its width, so the run's spend and its
              latency are read in one pass rather than one after the other. */}
          {trial.usage === null ? null : <TokenBand usage={trial.usage} />}

          <Waterfall
            running={trial.status === "running"}
            timed={trial.timed}
            trajectory={trial.trajectory}
          />
        </section>

        {/* The instruction that produced the trajectory above it. A reader
            looking at what an agent did could not see what it was asked
            without leaving the page, and the verify script is the companion to
            the exit code the rail states. */}
        {cell?.setup == null ? null : (
          <section className="flex flex-col gap-1.5">
            <PageHeading icon={SlidersHorizontalIcon} title="Setup" />
            <CellSetup setup={cell.setup} trials={[trial]} />
          </section>
        )}
      </EvalMain>

      <TrialRail trial={trial} />
    </EvalLayout>
  );
}

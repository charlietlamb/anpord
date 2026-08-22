import { PulseIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { EvalLayout, EvalMain } from "@/components/evals/eval-layout";
import { TrialRail } from "@/components/evals/trial-rail";
import { Waterfall } from "@/components/evals/waterfall";
import { PageHeading } from "@/components/layout/page-heading";
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

  if (trial === undefined) {
    return null;
  }

  return (
    <EvalLayout>
      <EvalMain>
        <section className="flex flex-col gap-1.5">
          <PageHeading icon={PulseIcon} title="Trajectory" />
          <Waterfall timed={trial.timed} trajectory={trial.trajectory} />
        </section>
      </EvalMain>

      <TrialRail trial={trial} />
    </EvalLayout>
  );
}

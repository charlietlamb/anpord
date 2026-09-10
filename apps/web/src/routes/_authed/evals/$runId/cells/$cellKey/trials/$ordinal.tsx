import { PageHeading } from "@anpord/ui/components/ui/page-heading";
import { PulseIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CellSetup } from "@/components/evals/cell-setup";
import { EvalLayout, EvalMain } from "@/components/evals/eval-layout";
import { TokenBand } from "@/components/evals/token-band";
import { TrialArtifacts } from "@/components/evals/trial-artifacts";
import { TrialCalls } from "@/components/evals/trial-calls";
import { TrialRail } from "@/components/evals/trial-rail";
import { TrialSkeleton } from "@/components/evals/trial-skeleton";
import { ValidationInspector } from "@/components/evals/validation-inspector";
import { Waterfall } from "@/components/evals/waterfall";
import { ErrorCard } from "@/components/layout/error-card";
import { evalQueries } from "@/lib/evals/eval-queries";

export const Route = createFileRoute(
  "/_authed/evals/$runId/cells/$cellKey/trials/$ordinal"
)({
  component: TrialScreen,
  staticData: {
    crumb: (params: Record<string, string>) => `Trial ${params.ordinal}`,
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
    return <TrialSkeleton ordinal={ordinal} />;
  }

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

          {trial.usage === null ? null : <TokenBand usage={trial.usage} />}

          <Waterfall
            running={trial.status === "running"}
            timed={trial.timed}
            trajectory={trial.trajectory}
          />
        </section>

        <TrialArtifacts
          artifacts={trial.artifacts}
          trial={{ id: runId, cellKey, ordinal: trial.ordinal }}
        />

        <ValidationInspector
          files={cell?.setup?.validatorFiles}
          key={`${cellKey}:${ordinal}`}
          trials={[trial]}
        />

        {cell?.setup == null ? null : (
          <CellSetup setup={cell.setup} trials={[trial]} />
        )}

        <TrialCalls trajectory={trial.trajectory} />
      </EvalMain>

      <TrialRail trial={trial} trigger={run.trigger} />
    </EvalLayout>
  );
}

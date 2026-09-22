import { PageHeading } from "@anpord/ui/components/ui/page-heading";
import {
  ChatsCircleIcon,
  CheckSquareIcon,
  FileCodeIcon,
  FilesIcon,
  FlaskIcon,
  PulseIcon,
  SlidersHorizontalIcon,
  SquaresFourIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CellSetup } from "@/components/evals/cell-setup";
import { Conversation } from "@/components/evals/conversation";
import { EvalLayout, EvalMain } from "@/components/evals/eval-layout";
import { TokenBand } from "@/components/evals/token-band";
import { TrialArtifacts } from "@/components/evals/trial-artifacts";
import { TrialCalls } from "@/components/evals/trial-calls";
import { TrialRail } from "@/components/evals/trial-rail";
import { TrialSections } from "@/components/evals/trial-sections";
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
        <PageHeading
          icon={FlaskIcon}
          title={cell?.caseName ?? `Trial ${ordinal}`}
        />

        {trial.usage === null ? null : <TokenBand usage={trial.usage} />}

        <TrialSections
          sections={[
            {
              Icon: PulseIcon,
              content: (
                <Waterfall
                  running={trial.status === "running"}
                  timed={trial.timed}
                  trajectory={trial.trajectory}
                />
              ),
              label: "Timeline",
              value: "timeline",
            },
            {
              Icon: ChatsCircleIcon,
              content: (
                <Conversation
                  running={trial.status === "running"}
                  trajectory={trial.trajectory}
                  written={{
                    artifacts: trial.artifacts ?? [],
                    trial: { cellKey, id: runId, ordinal: trial.ordinal },
                  }}
                />
              ),
              label: "Conversation",
              value: "conversation",
            },
            ...(trial.artifacts?.length
              ? [
                  {
                    Icon: FilesIcon,
                    content: (
                      <TrialArtifacts
                        artifacts={trial.artifacts}
                        titled={false}
                        trial={{ id: runId, cellKey, ordinal: trial.ordinal }}
                      />
                    ),
                    label: "Files",
                    value: "files",
                  },
                ]
              : []),
            {
              Icon: CheckSquareIcon,
              content: (
                <ValidationInspector
                  files={cell?.setup?.validatorFiles}
                  key={`${cellKey}:${ordinal}`}
                  titled={false}
                  trials={[trial]}
                />
              ),
              label: "Validation",
              value: "validation",
            },
            ...(cell?.setup?.validatorFiles?.length
              ? [
                  {
                    Icon: FileCodeIcon,
                    content: (
                      <ValidationInspector
                        files={cell.setup.validatorFiles}
                        titled={false}
                        trials={[trial]}
                        view="source"
                      />
                    ),
                    label: "Source",
                    value: "source",
                  },
                ]
              : []),
            ...(cell?.setup == null
              ? []
              : [
                  {
                    Icon: SlidersHorizontalIcon,
                    content: <CellSetup setup={cell.setup} trials={[trial]} />,
                    label: "Setup",
                    value: "setup",
                  },
                ]),
            {
              Icon: SquaresFourIcon,
              content: <TrialCalls trajectory={trial.trajectory} />,
              label: "Calls",
              value: "calls",
            },
          ]}
        />
      </EvalMain>

      <TrialRail trial={trial} trigger={run.trigger} />
    </EvalLayout>
  );
}

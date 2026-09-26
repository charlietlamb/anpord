import type { EvalRun, EvalTrial } from "@anpord/schema/domain/evals";
import {
  ResizablePanel,
  ResizablePanelGroup,
} from "@anpord/ui/components/ui/resizable";
import {
  ChatsCircleIcon,
  CheckSquareIcon,
  FilesIcon,
  InfoIcon,
  PulseIcon,
  SlidersHorizontalIcon,
  SquaresFourIcon,
} from "@phosphor-icons/react";
import { CaseSetup } from "@/components/evals/case-setup";
import { Conversation } from "@/components/evals/conversation";
import { RunCaseButton } from "@/components/evals/run-case-button";
import { TrialCalls } from "@/components/evals/trial-calls";
import { TrialChecks } from "@/components/evals/trial-checks";
import { TrialDetails } from "@/components/evals/trial-details";
import { TrialFiles } from "@/components/evals/trial-files";
import { TrialMeta } from "@/components/evals/trial-meta";
import { TrialSections } from "@/components/evals/trial-sections";
import { TrialStepPane } from "@/components/evals/trial-step-pane";
import { TrialTimeline } from "@/components/evals/trial-timeline";
import { PageShell } from "@/components/layout/page-shell";
import { SideSheet } from "@/components/layout/side-sheet";

export function TrialView({
  run,
  trial,
}: {
  readonly run: EvalRun;
  readonly trial: EvalTrial;
}) {
  const running = trial.status === "running";

  return (
    <ResizablePanelGroup className="min-h-0 flex-1" id="trial">
      <ResizablePanel className="flex min-h-0 flex-col" id="page" minSize="40%">
        <PageShell
          actions={
            <>
              <SideSheet
                description="What this trial cost, how long it took, and what it changed."
                icon={InfoIcon}
                title="Details"
                trigger="Details"
              >
                <TrialDetails trial={trial} />
              </SideSheet>
              <SideSheet
                description="How this run was set up and judged."
                flush
                icon={SlidersHorizontalIcon}
                title="Setup"
                trigger="Setup"
              >
                <CaseSetup setup={run.setup} />
              </SideSheet>
              <RunCaseButton caseId={run.case.id} variant={run.variant} />
            </>
          }
          description={<TrialMeta run={run} trial={trial} />}
          title={run.case.name}
          width="wide"
        >
          <TrialSections
            sections={[
              {
                Icon: PulseIcon,
                content: (
                  <TrialTimeline
                    running={running}
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
                    running={running}
                    trajectory={trial.trajectory}
                    written={{
                      artifacts: trial.artifacts,
                      trial: { trialId: trial.id },
                    }}
                  />
                ),
                label: "Conversation",
                value: "conversation",
              },
              {
                Icon: CheckSquareIcon,
                content: (
                  <TrialChecks key={trial.id} setup={run.setup} trial={trial} />
                ),
                label: "Checks",
                value: "checks",
              },
              ...(trial.artifacts.length > 0 || trial.filesChanged.length > 0
                ? [
                    {
                      Icon: FilesIcon,
                      content: (
                        <TrialFiles
                          artifacts={trial.artifacts}
                          changed={trial.filesChanged}
                          trial={{ trialId: trial.id }}
                        />
                      ),
                      label: "Files",
                      value: "files",
                    },
                  ]
                : []),
              {
                Icon: SquaresFourIcon,
                content: <TrialCalls trajectory={trial.trajectory} />,
                label: "Calls",
                value: "calls",
              },
            ]}
          />
        </PageShell>
      </ResizablePanel>
      <TrialStepPane trial={trial} />
    </ResizablePanelGroup>
  );
}

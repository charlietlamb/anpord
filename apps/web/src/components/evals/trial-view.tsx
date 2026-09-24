import type { EvalRun, EvalTrial } from "@anpord/schema/domain/evals";
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
import { TokenBand } from "@/components/evals/token-band";
import { TrialCalls } from "@/components/evals/trial-calls";
import { TrialChecks } from "@/components/evals/trial-checks";
import { TrialDetails } from "@/components/evals/trial-details";
import { TrialFiles } from "@/components/evals/trial-files";
import { TrialMeta } from "@/components/evals/trial-meta";
import { TrialSections } from "@/components/evals/trial-sections";
import { TrialStepSheet } from "@/components/evals/trial-step-sheet";
import { Waterfall } from "@/components/evals/waterfall";
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
      {trial.usage === null ? null : <TokenBand usage={trial.usage} />}

      <TrialSections
        sections={[
          {
            Icon: PulseIcon,
            content: (
              <Waterfall
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
      <TrialStepSheet trial={trial} />
    </PageShell>
  );
}

import type { EvalCell, EvalRun, EvalTrial } from "@anpord/schema/domain/evals";
import {
  ChatsCircleIcon,
  CheckSquareIcon,
  FilesIcon,
  InfoIcon,
  PulseIcon,
  SquaresFourIcon,
} from "@phosphor-icons/react";
import { Conversation } from "@/components/evals/conversation";
import { RunVariantButton } from "@/components/evals/run-variant-button";
import { SetupSheet } from "@/components/evals/setup-sheet";
import { TokenBand } from "@/components/evals/token-band";
import { TrialCalls } from "@/components/evals/trial-calls";
import { TrialChecks } from "@/components/evals/trial-checks";
import { TrialDetails } from "@/components/evals/trial-details";
import { TrialFiles } from "@/components/evals/trial-files";
import { TrialMeta } from "@/components/evals/trial-meta";
import { TrialSections } from "@/components/evals/trial-sections";
import { TrialSetup } from "@/components/evals/trial-setup";
import { TrialStepSheet } from "@/components/evals/trial-step-sheet";
import { Waterfall } from "@/components/evals/waterfall";
import { PageShell } from "@/components/layout/page-shell";
import { SideSheet } from "@/components/layout/side-sheet";

export function TrialView({
  caseId,
  cell,
  run,
  trial,
}: {
  readonly caseId: string;
  readonly cell: EvalCell;
  readonly run: EvalRun;
  readonly trial: EvalTrial;
}) {
  const cellKey = cell.cellKey ?? "";
  const runId = run.id;
  const variant = run.variants[cell.variantIndex];
  const running = trial.status === "running";

  return (
    <PageShell
      actions={
        <>
          <SideSheet
            description="What this trial cost, how long it took, and what it changed."
            title="Details"
            trigger={
              <>
                <InfoIcon className="size-3.5" />
                Details
              </>
            }
          >
            <TrialDetails trial={trial} />
          </SideSheet>
          {cell.setup === null ? null : (
            <SetupSheet description="How this trial was set up and judged.">
              <TrialSetup setup={cell.setup} />
            </SetupSheet>
          )}
          {variant === undefined ? null : (
            <RunVariantButton
              caseId={caseId}
              entry={{ cellKey, model: variant.model, runId }}
            />
          )}
        </>
      }
      description={<TrialMeta run={run} trial={trial} variant={variant} />}
      title={cell.caseName}
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
                  artifacts: trial.artifacts ?? [],
                  trial: { cellKey, id: runId, ordinal: trial.ordinal },
                }}
              />
            ),
            label: "Conversation",
            value: "conversation",
          },
          {
            Icon: CheckSquareIcon,
            content: (
              <TrialChecks
                key={`${cellKey}:${trial.ordinal}`}
                setup={cell.setup}
                trial={trial}
              />
            ),
            label: "Checks",
            value: "checks",
          },
          ...(trial.artifacts?.length || trial.filesChanged.length
            ? [
                {
                  Icon: FilesIcon,
                  content: (
                    <TrialFiles
                      artifacts={trial.artifacts ?? []}
                      changed={trial.filesChanged}
                      trial={{ id: runId, cellKey, ordinal: trial.ordinal }}
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

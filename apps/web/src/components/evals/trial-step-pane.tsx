import type { EvalTrial } from "@sphynx/schema/domain/eval-trial";
import {
  ResizableHandle,
  ResizablePanel,
} from "@sphynx/ui/components/ui/resizable";
// biome-ignore lint/correctness/noUnresolvedImports: biome cannot see the Suspense export in the react types
import { Suspense } from "react";
import { selectedStepOf } from "@/lib/evals/selected-step";
import { buildTimeline, findStep } from "@/lib/evals/timeline-sections";
import { StepPanePanel } from "@/lib/evals/trial-panels";
import { useSelectedStep } from "@/lib/evals/use-selected-step";
import { waterfallLayout } from "@/lib/evals/waterfall-layout";

export function TrialStepPane({ trial }: { readonly trial: EvalTrial }) {
  const [step, setStep] = useSelectedStep();
  const found = findStep(buildTimeline(trial.trajectory), step);

  if (found === null) {
    return null;
  }

  const { rows } = waterfallLayout(trial.trajectory);
  const lead = selectedStepOf(trial.trajectory, rows, step)?.row?.lead ?? null;

  return (
    <>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize="36%" id="step" maxSize="60%" minSize="24%">
        <Suspense fallback={null}>
          <StepPanePanel.Component
            count={trial.trajectory.length}
            onClose={() => setStep(null)}
            onStep={setStep}
            section={found.section}
            step={found.step}
            thinkingMs={lead?.durationMs ?? null}
          />
        </Suspense>
      </ResizablePanel>
    </>
  );
}

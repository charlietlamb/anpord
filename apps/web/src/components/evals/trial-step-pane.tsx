import type { EvalTrial } from "@anpord/schema/domain/evals";
import {
  ResizableHandle,
  ResizablePanel,
} from "@anpord/ui/components/ui/resizable";
import { StepPane } from "@/components/evals/step-pane";
import { selectedStepOf } from "@/lib/evals/selected-step";
import { buildTimeline, findStep } from "@/lib/evals/timeline-sections";
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
        <StepPane
          count={trial.trajectory.length}
          onClose={() => setStep(null)}
          onStep={setStep}
          section={found.section}
          step={found.step}
          thinkingMs={lead?.durationMs ?? null}
        />
      </ResizablePanel>
    </>
  );
}

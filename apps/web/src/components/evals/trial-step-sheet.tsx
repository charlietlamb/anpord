import type { EvalTrial } from "@anpord/schema/domain/evals";
import { StepDetail } from "@/components/evals/step-detail";
import { StepNav } from "@/components/evals/step-nav";
import { SideSheet } from "@/components/layout/side-sheet";
import { selectedStepOf } from "@/lib/evals/selected-step";
import { buildTimeline, findStep } from "@/lib/evals/timeline-sections";
import { useSelectedStep } from "@/lib/evals/use-selected-step";
import { waterfallLayout } from "@/lib/evals/waterfall-layout";

export function TrialStepSheet({ trial }: { readonly trial: EvalTrial }) {
  const [step, setStep] = useSelectedStep();
  const found = findStep(buildTimeline(trial.trajectory), step);
  const { rows } = waterfallLayout(trial.trajectory);
  const lead = selectedStepOf(trial.trajectory, rows, step)?.row?.lead ?? null;
  const count = trial.trajectory.length;

  return (
    <SideSheet
      actions={
        found === null ? null : (
          <StepNav count={count} onStep={setStep} step={found.step.index} />
        )
      }
      onClose={() => setStep(null)}
      open={found !== null}
      title={
        found === null ? "Step" : `Step ${found.step.index + 1} of ${count}`
      }
    >
      {found === null ? null : (
        <StepDetail
          section={found.section}
          step={found.step}
          thinkingMs={lead?.durationMs ?? null}
        />
      )}
    </SideSheet>
  );
}

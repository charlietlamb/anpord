import type { EvalTrial } from "@anpord/schema/domain/evals";
import { StepDetail } from "@/components/evals/waterfall-detail";
import { SideSheet } from "@/components/layout/side-sheet";
import { selectedStepOf } from "@/lib/evals/selected-step";
import { useSelectedStep } from "@/lib/evals/use-selected-step";
import { waterfallLayout } from "@/lib/evals/waterfall-layout";

export function TrialStepSheet({ trial }: { readonly trial: EvalTrial }) {
  const [step, setStep] = useSelectedStep();
  const { rows } = waterfallLayout(trial.trajectory);
  const selected = selectedStepOf(trial.trajectory, rows, step);

  return (
    <SideSheet
      onClose={() => setStep(null)}
      open={selected !== null}
      title="Step"
    >
      {selected === null ? null : <StepDetail step={selected} />}
    </SideSheet>
  );
}

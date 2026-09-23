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
      onOpenChange={(open) => {
        if (!open) {
          setStep(null);
        }
      }}
      open={selected !== null}
      title="Step"
    >
      {selected === null ? null : (
        <div className="p-4">
          <StepDetail step={selected} />
        </div>
      )}
    </SideSheet>
  );
}

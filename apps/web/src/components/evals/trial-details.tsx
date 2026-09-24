import type { EvalTrial } from "@anpord/schema/domain/evals";
import { RailSection } from "@anpord/ui/components/ui/rail-section";
import { ChangedFileRow } from "@/components/evals/changed-file-row";
import { CostBreakdown } from "@/components/evals/cost-breakdown";
import { TrialCost } from "@/components/evals/trial-cost";
import { TrialOutcome } from "@/components/evals/trial-outcome";
import { TrialTime } from "@/components/evals/trial-time";

export function TrialDetails({ trial }: { readonly trial: EvalTrial }) {
  return (
    <div className="flex flex-col gap-6">
      <TrialOutcome trial={trial} />
      <TrialTime trial={trial} />

      {trial.costs === null ? null : (
        <RailSection title="Cost">
          <CostBreakdown costs={trial.costs} />
        </RailSection>
      )}

      {trial.usage === null ? null : (
        <RailSection title="Usage">
          <TrialCost turns={trial.commands} usage={trial.usage} />
        </RailSection>
      )}

      {trial.filesChanged.length === 0 ? null : (
        <RailSection title="Files changed">
          <ul className="flex flex-col gap-1">
            {trial.filesChanged.map((path) => (
              <ChangedFileRow key={path} path={path} />
            ))}
          </ul>
        </RailSection>
      )}
    </div>
  );
}

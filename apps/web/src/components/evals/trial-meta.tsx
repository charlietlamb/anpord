import type { EvalRun, EvalTrial } from "@anpord/schema/domain/evals";
import { AgeCell } from "@anpord/ui/components/evals/age-cell";
import { EvalStatusBadge } from "@anpord/ui/components/evals/eval-status-badge";
import { VariantCell } from "@anpord/ui/components/evals/variant-cell";
import { trialStatus } from "@anpord/ui/lib/evals/eval-status";
import { SourceLabel } from "@/components/evals/source-label";

export function TrialMeta({
  run,
  trial,
}: {
  readonly run: EvalRun;
  readonly trial: EvalTrial;
}) {
  return (
    <span className="flex flex-wrap items-center gap-2.5 text-sm">
      <VariantCell harness={run.variant.harness} model={run.variant.model} />
      <SourceLabel
        local={run.local}
        sandbox={run.variant.sandbox}
        trigger={run.trigger}
      />
      <EvalStatusBadge status={trialStatus(trial.status)} />
      <AgeCell at={run.finishedAt?.epochMillis ?? null} />
    </span>
  );
}

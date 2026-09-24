import type { EvalRun, EvalTrial } from "@anpord/schema/domain/evals";
import { EvalStatusBadge } from "@/components/evals/eval-status-badge";
import { SourceLabel } from "@/components/evals/source-label";
import { VariantCell } from "@/components/evals/variant-cell";
import { AgeCell } from "@/components/layout/age-cell";
import { trialStatus } from "@/lib/evals/eval-status";

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

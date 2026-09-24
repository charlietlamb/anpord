import type {
  EvalRun,
  EvalTrial,
  EvalVariant,
} from "@anpord/schema/domain/evals";
import { AgeCell } from "@/components/evals/age-cell";
import { EvalStatusBadge } from "@/components/evals/eval-status-badge";
import { SourceLabel } from "@/components/evals/source-label";
import { VariantCell } from "@/components/evals/variant-cell";
import { trialStatus } from "@/lib/evals/eval-status";

export function TrialMeta({
  run,
  trial,
  variant,
}: {
  readonly run: EvalRun;
  readonly trial: EvalTrial;
  readonly variant: EvalVariant | undefined;
}) {
  return (
    <span className="flex flex-wrap items-center gap-2.5 text-sm">
      {variant === undefined ? null : (
        <VariantCell harness={variant.harness} model={variant.model} />
      )}
      <SourceLabel
        local={run.executedBy === "client"}
        sandbox={variant?.sandbox ?? ""}
        trigger={run.trigger}
      />
      <EvalStatusBadge status={trialStatus(trial.status)} />
      <AgeCell at={run.finishedAt?.epochMillis ?? null} />
    </span>
  );
}

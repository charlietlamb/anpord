import type { EvalRun, EvalTrial } from "@anpord/schema/domain/evals";
import { AgeCell } from "@anpord/ui/components/evals/age-cell";
import { EvalStatusBadge } from "@anpord/ui/components/evals/eval-status-badge";
import { VariantCell } from "@anpord/ui/components/evals/variant-cell";
import {
  DataTableChevron,
  DataTableRow,
} from "@anpord/ui/components/ui/data-table";
import { trialStatus } from "@anpord/ui/lib/evals/eval-status";
import { Link } from "@tanstack/react-router";
import { SourceLabel } from "@/components/evals/source-label";
import { trialVerdict } from "@/lib/evals/trial-verdict";

export function RunTrialRow({
  caseId,
  run,
  trial,
}: {
  readonly caseId: string;
  readonly run: EvalRun;
  readonly trial: EvalTrial;
}) {
  return (
    <DataTableRow
      render={
        <Link
          params={{ caseId, trialId: trial.id }}
          to="/evals/cases/$caseId/trials/$trialId"
        />
      }
    >
      <VariantCell harness={run.variant.harness} model={run.variant.model} />

      <span className="truncate text-foreground">{trialVerdict(trial)}</span>

      <SourceLabel
        local={run.local}
        sandbox={run.variant.sandbox}
        trigger={run.trigger}
      />

      <span>
        <EvalStatusBadge status={trialStatus(trial.status)} />
      </span>

      <AgeCell at={run.finishedAt?.epochMillis ?? null} />

      <DataTableChevron />
    </DataTableRow>
  );
}

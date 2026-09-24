import type { EvalRun, EvalTrial } from "@anpord/schema/domain/evals";
import {
  DataTableChevron,
  DataTableRow,
} from "@anpord/ui/components/ui/data-table";
import { Link } from "@tanstack/react-router";
import { EvalStatusBadge } from "@/components/evals/eval-status-badge";
import { SourceLabel } from "@/components/evals/source-label";
import { VariantCell } from "@/components/evals/variant-cell";
import { AgeCell } from "@/components/layout/age-cell";
import { trialStatus } from "@/lib/evals/eval-status";
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

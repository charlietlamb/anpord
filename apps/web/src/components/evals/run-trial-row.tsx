import type { EvalTrial } from "@sphynx/schema/domain/eval-trial";
import type { EvalRun } from "@sphynx/schema/domain/evals";
import { AgeCell } from "@sphynx/ui/components/evals/age-cell";
import { EvalStatusBadge } from "@sphynx/ui/components/evals/eval-status-badge";
import { VariantCell } from "@sphynx/ui/components/evals/variant-cell";
import {
  DataTableChevron,
  DataTableRow,
} from "@sphynx/ui/components/ui/data-table";
import { trialStatus } from "@sphynx/ui/lib/evals/eval-status";
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

import type {
  EvalCellHistoryEntry,
  EvalTrial,
} from "@anpord/schema/domain/evals";
import { DataTableRow } from "@anpord/ui/components/ui/data-table";
import { CaretRightIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { AgeCell } from "@/components/evals/age-cell";
import { EvalStatusBadge } from "@/components/evals/eval-status-badge";
import { SourceLabel } from "@/components/evals/source-label";
import { VariantCell } from "@/components/evals/variant-cell";
import { trialStatus } from "@/lib/evals/eval-status";
import { trialVerdict } from "@/lib/evals/trial-verdict";

export function CaseTrialRow({
  caseId,
  entry,
  trial,
}: {
  readonly caseId: string;
  readonly entry: EvalCellHistoryEntry;
  readonly trial: EvalTrial;
}) {
  return (
    <DataTableRow
      render={
        trial.id === undefined ? undefined : (
          <Link
            params={{ caseId, trialId: trial.id }}
            to="/evals/cases/$caseId/trials/$trialId"
          />
        )
      }
    >
      <VariantCell harness={entry.harness} model={entry.model} />

      <span className="truncate text-foreground">{trialVerdict(trial)}</span>

      <SourceLabel
        local={entry.local}
        sandbox={entry.sandbox}
        trigger={entry.trigger}
      />

      <span>
        <EvalStatusBadge status={trialStatus(trial.status)} />
      </span>

      <AgeCell at={entry.finishedAt?.epochMillis ?? null} />

      <CaretRightIcon
        aria-hidden="true"
        className="size-3.5 text-muted-foreground"
      />
    </DataTableRow>
  );
}

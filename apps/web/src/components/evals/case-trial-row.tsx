import type {
  EvalCellHistoryEntry,
  EvalTrial,
} from "@anpord/schema/domain/evals";
import { DataTableRow } from "@anpord/ui/components/ui/data-table";
import { CaretRightIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { AgeCell } from "@/components/evals/age-cell";
import { TrialStatusPill } from "@/components/evals/eval-status-badge";
import { VariantCell } from "@/components/evals/variant-cell";
import { triggerPresentation } from "@/lib/evals/run-trigger";
import { trialVerdict } from "@/lib/evals/trial-verdict";
import { placePresentation } from "@/lib/evals/variant-presentation";

export function CaseTrialRow({
  caseId,
  entry,
  trial,
}: {
  readonly caseId: string;
  readonly entry: EvalCellHistoryEntry;
  readonly trial: EvalTrial;
}) {
  const trigger = triggerPresentation(entry.trigger);
  const where = placePresentation(entry).label;

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

      <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
        <trigger.Icon aria-hidden="true" className="size-3.5 shrink-0" />
        <span className="truncate">
          {trigger.label} · {where}
        </span>
      </span>

      <span>
        <TrialStatusPill status={trial.status} />
      </span>

      <AgeCell at={entry.finishedAt?.epochMillis ?? null} />

      <CaretRightIcon
        aria-hidden="true"
        className="size-3.5 text-muted-foreground"
      />
    </DataTableRow>
  );
}

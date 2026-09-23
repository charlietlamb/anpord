import type { EvalCellHistoryEntry } from "@anpord/schema/domain/evals";
import { RerunButton } from "@/components/evals/rerun-button";
import { useRerunCell } from "@/lib/evals/eval-mutations";

export function RunVariantButton({
  caseId,
  entry,
}: {
  readonly caseId: string;
  readonly entry: EvalCellHistoryEntry;
}) {
  return (
    <RerunButton
      label="Run this variant"
      rerun={useRerunCell(caseId, entry)}
      started={`Running ${entry.model} again`}
    />
  );
}

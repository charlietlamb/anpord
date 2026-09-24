import type { EvalTrial } from "@anpord/schema/domain/evals";
import { readingOf, stepsOf } from "@anpord/schema/domain/verify-steps";
import { verdictsOf } from "@anpord/schema/domain/verify-verdicts";
import { CopyButton } from "@anpord/ui/components/copy-button";
import {
  DataTable,
  DataTableBody,
  DataTableFooter,
  DataTableHead,
  DataTableRow,
} from "@anpord/ui/components/ui/data-table";
import { EvalStatusBadge } from "@/components/evals/eval-status-badge";
import { VerifyReading } from "@/components/evals/verify-reading";
import { VERIFY_TABLE } from "@/lib/evals/case-tables";
import { verdictStatus, verdictSummary } from "@/lib/evals/eval-status";

export function VerifyResults({
  command,
  trials,
}: {
  readonly command: string;
  readonly trials: readonly EvalTrial[];
}) {
  const steps = stepsOf(command);
  const verdicts = verdictsOf(steps, trials);

  return (
    <DataTable columns={VERIFY_TABLE.columns} label={VERIFY_TABLE.label}>
      <DataTableHead headings={VERIFY_TABLE.headings} />
      <DataTableBody>
        {steps.map((step, index) => (
          <DataTableRow key={step}>
            <VerifyReading reading={readingOf(step)} step={step} />
            <span>
              <EvalStatusBadge
                status={verdictStatus(verdicts[index] ?? "unknown")}
              />
            </span>
          </DataTableRow>
        ))}
      </DataTableBody>
      <DataTableFooter
        actions={
          <CopyButton
            label="Copy verify script"
            size="inline"
            value={command}
          />
        }
      >
        {verdictSummary(verdicts)}
      </DataTableFooter>
    </DataTable>
  );
}

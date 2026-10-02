import type { EvalTrial } from "@sphynx/schema/domain/eval-trial";
import { readingOf, stepsOf } from "@sphynx/schema/domain/verify-steps";
import { verdictsOf } from "@sphynx/schema/domain/verify-verdicts";
import { CopyButton } from "@sphynx/ui/components/copy-button";
import { EvalStatusBadge } from "@sphynx/ui/components/evals/eval-status-badge";
import {
  DataTable,
  DataTableBody,
  DataTableFooter,
  DataTableHead,
  DataTableRow,
} from "@sphynx/ui/components/ui/data-table";
import {
  verdictStatus,
  verdictSummary,
} from "@sphynx/ui/lib/evals/eval-status";
import { VerifyReading } from "@/components/evals/verify-reading";
import { VERIFY_TABLE } from "@/lib/evals/case-tables";

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

import type { EvalJournalEntry } from "@anpord/schema/domain/evals";
import {
  DataTable,
  DataTableBody,
  DataTableFooter,
  DataTableHead,
  DataTableRow,
} from "@anpord/ui/components/ui/data-table";
import { StepLabel } from "@/components/evals/step-label";
import { STEPS_TABLE } from "@/lib/evals/case-tables";
import { journalKey } from "@/lib/evals/journal-presentation";
import { useSelectedStep } from "@/lib/evals/use-selected-step";

export function UntimedSteps({
  trajectory,
}: {
  readonly trajectory: readonly EvalJournalEntry[];
}) {
  const [step, setStep] = useSelectedStep();

  return (
    <DataTable columns={STEPS_TABLE.columns} label={STEPS_TABLE.label}>
      <DataTableHead headings={STEPS_TABLE.headings} />
      <DataTableBody>
        {trajectory.map((entry, index) => (
          <DataTableRow
            aria-pressed={step === index}
            key={journalKey(entry, index)}
            render={
              <button
                onClick={() => setStep(step === index ? null : index)}
                type="button"
              />
            }
            selected={step === index}
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <StepLabel entry={entry} />
            </span>
          </DataTableRow>
        ))}
      </DataTableBody>
      <DataTableFooter>
        Durations weren't recorded for this trial, so steps are listed in order.
      </DataTableFooter>
    </DataTable>
  );
}

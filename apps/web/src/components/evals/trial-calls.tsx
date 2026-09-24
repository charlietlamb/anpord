import type { EvalJournalEntry } from "@anpord/schema/domain/evals";
import {
  DataTable,
  DataTableBody,
  DataTableFooter,
  DataTableHead,
  DataTableRow,
} from "@anpord/ui/components/ui/data-table";
import { StepLabel } from "@/components/evals/step-label";
import { CALLS_TABLE } from "@/lib/evals/case-tables";
import {
  type Call,
  counted,
  durationOf,
  stepFailed,
} from "@/lib/evals/conversation";
import { seconds } from "@/lib/evals/duration";
import { useSelectedStep } from "@/lib/evals/use-selected-step";

const isCall = (entry: EvalJournalEntry): entry is Call =>
  entry._tag === "command" || entry._tag === "toolCall";

export function TrialCalls({
  trajectory,
}: {
  readonly trajectory: readonly EvalJournalEntry[];
}) {
  const [step, setStep] = useSelectedStep();

  const calls = trajectory.flatMap((entry, at) =>
    isCall(entry) ? [{ at, call: entry }] : []
  );

  if (calls.length === 0) {
    return null;
  }

  const failed = calls.filter(({ call }) => stepFailed(call)).length;

  return (
    <DataTable columns={CALLS_TABLE.columns} label={CALLS_TABLE.label}>
      <DataTableHead headings={CALLS_TABLE.headings} />

      <DataTableBody>
        {calls.map(({ at, call }, index) => {
          const took = durationOf(call);

          return (
            <DataTableRow
              aria-pressed={step === at}
              key={at}
              render={
                <button
                  onClick={() => setStep(step === at ? null : at)}
                  type="button"
                />
              }
              selected={step === at}
            >
              <span className="text-muted-foreground text-xs tabular-nums">
                {index + 1}
              </span>
              <span className="flex min-w-0 items-center gap-2.5">
                <StepLabel entry={call} />
              </span>
              <span className="text-muted-foreground tabular-nums">
                {took === null ? null : seconds(took)}
              </span>
            </DataTableRow>
          );
        })}
      </DataTableBody>

      <DataTableFooter>
        {counted(calls.length, "call", "calls")}
        {failed === 0 ? "" : `, ${failed} failed`}
      </DataTableFooter>
    </DataTable>
  );
}

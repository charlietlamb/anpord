import type { EvalJournalEntry } from "@anpord/schema/domain/evals";
import { counted } from "@anpord/ui/lib/evals/counted";
import { seconds } from "@anpord/ui/lib/evals/duration";
import { StepLabel } from "@/components/evals/step-label";
import {
  StepList,
  StepListBody,
  StepListFooter,
  StepListHead,
  StepListRow,
} from "@/components/evals/step-list";
import { CALLS_TABLE } from "@/lib/evals/case-tables";
import { type Call, durationOf, stepFailed } from "@/lib/evals/conversation";
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
    <StepList columns={CALLS_TABLE.columns} label={CALLS_TABLE.label}>
      <StepListHead headings={CALLS_TABLE.headings} />

      <StepListBody>
        {calls.map(({ at, call }, index) => {
          const took = durationOf(call);

          return (
            <StepListRow
              key={at}
              onClick={() => setStep(step === at ? null : at)}
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
            </StepListRow>
          );
        })}
      </StepListBody>

      <StepListFooter>
        {counted(calls.length, "call", "calls")}
        {failed === 0 ? "" : `, ${failed} failed`}
      </StepListFooter>
    </StepList>
  );
}

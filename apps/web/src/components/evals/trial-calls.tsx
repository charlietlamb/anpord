import type { EvalJournalEntry } from "@anpord/schema/domain/evals";
import { cn } from "@anpord/ui/lib/utils";
import { PlugsConnectedIcon } from "@phosphor-icons/react";
import {
  STEP_ROW,
  StepLabel,
  stepRowTone,
} from "@/components/evals/step-label";
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
    <div className="flex flex-col gap-2">
      <div className="flex h-6 items-center gap-2 px-2.5 text-muted-foreground text-sm">
        <PlugsConnectedIcon aria-hidden="true" className="size-4 shrink-0" />
        <h3>
          {counted(calls.length, "call", "calls")}
          {failed === 0 ? "" : `, ${failed} failed`}
        </h3>
      </div>

      <ol className="flex flex-col">
        {calls.map(({ at, call }, index) => {
          const took = durationOf(call);

          return (
            <li key={at}>
              <button
                aria-pressed={step === at}
                className={cn(
                  STEP_ROW,
                  stepRowTone(step === at),
                  "gap-2.5 px-2.5"
                )}
                onClick={() => setStep(step === at ? null : at)}
                type="button"
              >
                <span className="w-5 shrink-0 text-right font-medium text-[11px] text-muted-foreground tabular-nums">
                  {index + 1}
                </span>
                <StepLabel entry={call} />
                {took === null ? null : (
                  <span className="shrink-0 font-medium text-[11px] text-foreground/80 tabular-nums">
                    {seconds(took)}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

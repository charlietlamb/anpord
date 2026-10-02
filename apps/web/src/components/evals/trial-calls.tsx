import type { EvalJournalEntry } from "@sphynx/schema/domain/eval-trial";
import { counted } from "@sphynx/ui/lib/evals/counted";
import { seconds } from "@sphynx/ui/lib/evals/duration";
import { cn } from "@sphynx/ui/lib/utils";
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
import { useVirtualRows } from "@/lib/use-virtual-rows";

const ROW_HEIGHT = 41;
const NOTHING_PINNED: readonly number[] = [];

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
  const { height, listRef, measureRow, rows } =
    useVirtualRows<HTMLUListElement>({
      count: calls.length,
      pinned: NOTHING_PINNED,
      rowHeight: ROW_HEIGHT,
    });

  if (calls.length === 0) {
    return null;
  }

  const failed = calls.filter(({ call }) => stepFailed(call)).length;

  return (
    <StepList columns={CALLS_TABLE.columns} label={CALLS_TABLE.label}>
      <StepListHead headings={CALLS_TABLE.headings} />

      <StepListBody
        className="relative box-content"
        ref={listRef}
        style={{ height }}
      >
        {rows.map(({ index, offset }) => {
          const { at, call } = calls[index] as (typeof calls)[number];
          const took = durationOf(call);

          return (
            <StepListRow
              item={{
                className: cn(
                  "absolute inset-x-0 top-0",
                  index > 0 && "border-border border-t"
                ),
                "data-index": index,
                ref: measureRow,
                style: { transform: `translateY(${offset}px)` },
              }}
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

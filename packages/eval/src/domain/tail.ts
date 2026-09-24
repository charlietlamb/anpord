import type { EvalTailMark } from "@anpord/schema/domain/eval-tail";
import type { HarnessEvent } from "@anpord/schema/domain/harness-event";

export interface TailEvent extends EvalTailMark {
  readonly event: HarnessEvent;
}

type TrialAddress = Pick<EvalTailMark, "ordinal" | "run">;

const sameTrial = (left: TrialAddress, right: TrialAddress) =>
  left.run === right.run && left.ordinal === right.ordinal;

export const markFor = (marks: readonly EvalTailMark[], trial: TrialAddress) =>
  marks.find((mark) => sameTrial(mark, trial))?.seq ?? -1;

export const advance = (
  marks: readonly EvalTailMark[],
  events: readonly EvalTailMark[]
): readonly EvalTailMark[] =>
  events.reduce<readonly EvalTailMark[]>(
    (held, { ordinal, run, seq }) =>
      seq <= markFor(held, { ordinal, run })
        ? held
        : [
            ...held.filter((mark) => !sameTrial(mark, { ordinal, run })),
            { ordinal, run, seq },
          ],
    marks
  );

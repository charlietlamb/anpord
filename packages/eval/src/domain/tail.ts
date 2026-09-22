import type { HarnessEvent } from "@anpord/schema/domain/harness-event";

export interface TailMark {
  readonly cell: string;
  readonly ordinal: number;
  readonly seq: number;
}

export interface TailEvent extends TailMark {
  readonly event: HarnessEvent;
}

export interface RunTail {
  readonly events: readonly TailEvent[];
  readonly next: readonly TailMark[];
  readonly running: boolean;
  readonly settled: number;
}

type TrialAddress = Pick<TailMark, "cell" | "ordinal">;

const sameTrial = (left: TrialAddress, right: TrialAddress) =>
  left.cell === right.cell && left.ordinal === right.ordinal;

export const markFor = (marks: readonly TailMark[], trial: TrialAddress) =>
  marks.find((mark) => sameTrial(mark, trial))?.seq ?? -1;

export const advance = (
  marks: readonly TailMark[],
  events: readonly TailMark[]
): readonly TailMark[] =>
  events.reduce<readonly TailMark[]>(
    (held, { cell, ordinal, seq }) =>
      seq <= markFor(held, { cell, ordinal })
        ? held
        : [
            ...held.filter((mark) => !sameTrial(mark, { cell, ordinal })),
            { cell, ordinal, seq },
          ],
    marks
  );

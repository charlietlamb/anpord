import type { EvalJournalEntry } from "@anpord/schema/domain/evals";
import type { WaterfallRow } from "@/lib/evals/waterfall-layout";

export interface SelectedStep {
  readonly entry: EvalJournalEntry;
  readonly row: WaterfallRow | null;
}

export const selectedStepOf = (
  trajectory: readonly EvalJournalEntry[],
  rows: readonly WaterfallRow[],
  step: number | null
): SelectedStep | null => {
  const entry = step === null ? undefined : trajectory[step];

  return entry === undefined
    ? null
    : { entry, row: rows.find((row) => row.entry === entry) ?? null };
};

import type { evalEvent } from "@anpord/db/schema/evals/eval-events";
import type { HarnessEvent } from "../domain/harness-event";

type EventRow = typeof evalEvent.$inferSelect;

/* Rows must already be in seq order; nothing here sorts. */
export const groupByTrial = (
  rows: readonly EventRow[]
): ReadonlyMap<string, readonly HarnessEvent[]> => {
  const grouped = new Map<string, HarnessEvent[]>();

  for (const row of rows) {
    const journal = grouped.get(row.trialInternalId) ?? [];

    journal.push(row.payload as HarnessEvent);
    grouped.set(row.trialInternalId, journal);
  }

  return grouped;
};

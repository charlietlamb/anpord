import type { evalEvent } from "@anpord/db/schema/evals/eval-events";
import type { HarnessEvent } from "../domain/harness-event";

type EventRow = typeof evalEvent.$inferSelect;

/** The moments live in columns rather than in the payload, so a row read
 * back without this is a journal with no timing. */
const withTiming = (row: EventRow): HarnessEvent => {
  const payload = row.payload as HarnessEvent;

  if (row.occurredAt === null) {
    return payload;
  }

  const at = row.occurredAt.getTime();

  return payload._tag === "Command" && row.startedAt !== null
    ? { ...payload, at, startedAt: row.startedAt.getTime() }
    : { ...payload, at };
};

/** Rows must already be in `seq` order: the journal keeps the order it is
 * handed, and nothing here sorts. */
export const groupByTrial = (
  rows: readonly EventRow[]
): ReadonlyMap<string, readonly HarnessEvent[]> => {
  const grouped = new Map<string, HarnessEvent[]>();

  for (const row of rows) {
    const journal = grouped.get(row.trialInternalId) ?? [];

    journal.push(withTiming(row));
    grouped.set(row.trialInternalId, journal);
  }

  return grouped;
};

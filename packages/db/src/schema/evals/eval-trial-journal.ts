import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import type { HarnessEventRow } from "./eval-events";
import { evalTrial } from "./eval-trials";

/* Replaces a settled trial's `eval_event` rows, which nothing appends to and only the run detail page reads, whole. Keyed by the trial: at most one archive, dropped when a trial reopens. */
export const evalTrialJournal = pgTable("eval_trial_journal", {
  trialInternalId: text("trial_internal_id")
    .primaryKey()
    .references(() => evalTrial.internalId, { onDelete: "cascade" }),
  events: jsonb("events").$type<readonly HarnessEventRow[]>().notNull(),
  eventCount: integer("event_count").notNull(),
  compactedAt: timestamp("compacted_at").notNull().defaultNow(),
});

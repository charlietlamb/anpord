import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import type { HarnessEventRow } from "./eval-events";
import { evalTrial } from "./eval-trials";

/** A settled trial's journal, folded into one row once it has gone cold.
 *
 * `eval_event` holds a row per event while a trial is hot: it is appended to
 * mid-flight and read back with its timing columns. Nothing appends to a
 * settled trial, and after the retention window the only reader is the run
 * detail page, which wants the whole list at once. One jsonb row serves that
 * read and frees the per-event rows from the largest table in the system.
 *
 * The primary key is the trial itself: a trial has at most one archive, and a
 * reopened trial drops it along with the events it replaces. */
export const evalTrialJournal = pgTable("eval_trial_journal", {
  trialInternalId: text("trial_internal_id")
    .primaryKey()
    .references(() => evalTrial.internalId, { onDelete: "cascade" }),
  events: jsonb("events").$type<readonly HarnessEventRow[]>().notNull(),
  eventCount: integer("event_count").notNull(),
  compactedAt: timestamp("compacted_at").notNull().defaultNow(),
});

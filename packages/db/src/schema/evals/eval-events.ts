import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { evalTrial } from "./eval-trials";

/** The stored shape of a journal entry. Structural rather than imported from
 * the eval package, because the schema package must not depend on it. */
export type HarnessEventRow = { readonly _tag: string } & Record<
  string,
  unknown
>;

/** The journal: every command with its exit code, every file event, every
 * harness message, as one ordered sequence per trial.
 *
 * This is the highest-volume table in the system by a wide margin, so it
 * carries a retention policy from the start rather than after it becomes a
 * problem. Append only; nothing updates a row here. */
export const evalEvent = pgTable(
  "eval_event",
  {
    internalId: text("internal_id").primaryKey(),
    trialInternalId: text("trial_internal_id")
      .notNull()
      .references(() => evalTrial.internalId, { onDelete: "cascade" }),
    seq: integer("seq").notNull(),
    kind: text("kind").notNull(),
    payload: jsonb("payload").$type<HarnessEventRow>().notNull(),
    at: timestamp("at").notNull().defaultNow(),
    /* When the event happened, as against `at`, which is when the row was
       written. Events are appended in batches as a trial runs, so `at` is
       the moment a batch landed rather than the moment anything in it
       happened, and says nothing about how the time was spent.

       Nullable because it cannot be backfilled: the trials recorded before
       this existed never captured it, and null means unknown rather than
       1970. */
    occurredAt: timestamp("occurred_at"),
    /** When a command began. Only commands have a measured span; every other
     * kind is an instant and leaves this null. */
    startedAt: timestamp("started_at"),
  },
  (table) => [
    /* Unique, not merely indexed: seq is assigned from an array index per
       call, so two appends for one trial would both start at zero and the
       journal's order would be unrecoverable. */
    uniqueIndex("eval_event_trial_internal_id_seq_idx").on(
      table.trialInternalId,
      table.seq
    ),
    /* The retention sweep filters on age. Without this it scans the largest
       table in the system. */
    index("eval_event_at_idx").on(table.at),
  ]
);

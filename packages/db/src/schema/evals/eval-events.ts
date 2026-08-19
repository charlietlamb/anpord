import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { evalTrial } from "./eval-trials";

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
    payload: jsonb("payload").notNull(),
    at: timestamp("at").notNull().defaultNow(),
  },
  (table) => [
    index("eval_event_trial_internal_id_seq_idx").on(
      table.trialInternalId,
      table.seq
    ),
  ]
);

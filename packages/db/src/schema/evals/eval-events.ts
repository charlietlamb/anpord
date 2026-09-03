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

/* Structural rather than imported: the schema package must not depend on eval. */
export type HarnessEventRow = { readonly _tag: string } & Record<
  string,
  unknown
>;

/* The journal, one row per event. Append only; the retention sweep compacts it. */
export const evalEvent = pgTable(
  "eval_event",
  {
    internalId: text("internal_id").primaryKey(),
    trialInternalId: text("trial_internal_id")
      .notNull()
      .references(() => evalTrial.internalId, { onDelete: "cascade" }),
    seq: integer("seq").notNull(),
    payload: jsonb("payload").$type<HarnessEventRow>().notNull(),
    at: timestamp("at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("eval_event_trial_internal_id_seq_idx").on(
      table.trialInternalId,
      table.seq
    ),
    index("eval_event_at_idx").on(table.at),
  ]
);

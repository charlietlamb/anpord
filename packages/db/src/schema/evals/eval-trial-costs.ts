import {
  bigint,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { evalTrial } from "./eval-trials";

/* A row per component rather than a blob, so a sum is a query and the unique index keeps a component to one row. */
export const evalTrialCost = pgTable(
  "eval_trial_cost",
  {
    internalId: text("internal_id").primaryKey(),
    trialInternalId: text("trial_internal_id")
      .notNull()
      .references(() => evalTrial.internalId, { onDelete: "cascade" }),
    component: text("component").notNull(),
    classification: text("classification").notNull(),
    /* Nanos, not cents, because a cheap trial costs a fraction of one and a float drifts when summed. Always USD, since models.dev publishes nothing else; a second currency needs a column here. Null, never zero, which sums as free. */
    amountNanos: bigint("amount_nanos", { mode: "bigint" }),
    source: text("source").notNull(),
    explanation: text("explanation").notNull(),
    detail: jsonb("detail").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("eval_trial_cost_trial_component_idx").on(
      table.trialInternalId,
      table.component
    ),
  ]
);

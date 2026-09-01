import {
  bigint,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { evalTrial } from "./eval-trials";

/**
 * What one layer of a trial cost, and on what basis.
 *
 * A row per component rather than a blob on the trial, so a sum is a query:
 * "everything estimated on this run" is a filter and an aggregate, not a
 * decode of every trial in application memory. The unique index is what makes
 * a component appear exactly once, which a blob cannot promise.
 */
export const evalTrialCost = pgTable(
  "eval_trial_cost",
  {
    internalId: text("internal_id").primaryKey(),
    trialInternalId: text("trial_internal_id")
      .notNull()
      .references(() => evalTrial.internalId, { onDelete: "cascade" }),
    component: text("component").notNull(),
    classification: text("classification").notNull(),
    /* Nano-units of the rate's own currency, null where there is no amount to
       report rather than zero, which reads as free and sums as free.
       Every rate we read is quoted in USD -- models.dev publishes nothing
       else, and both providers bill in it -- so the unit is not carried per
       row; a second currency is a column beside this one.
       Integer because a cheap trial costs a fraction of a cent: cents cannot
       hold one, and a float summed across a run drifts. */
    amountNanos: bigint("amount_nanos", { mode: "bigint" }),
    source: text("source").notNull(),
    explanation: text("explanation").notNull(),
    /* What this layer measured, which differs by layer: a rate snapshot means
       nothing to the platform, and eval units mean nothing to the model. */
    detail: jsonb("detail").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("eval_trial_cost_trial_component_idx").on(
      table.trialInternalId,
      table.component
    ),
    /* The aggregate every run summary asks for: sum by classification. */
    index("eval_trial_cost_classification_idx").on(table.classification),
  ]
);

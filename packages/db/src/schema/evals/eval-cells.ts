import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { evalRun } from "./eval-runs";
import { evalTask } from "./eval-tasks";

/** The cell key is a content hash over task, harness, harness version, model
 * and provider. It is what makes two runs comparable a month apart, and it is
 * why harness version is a column rather than metadata: a comparison that
 * cannot see a harness upgrade decays silently. */
export const evalCell = pgTable(
  "eval_cell",
  {
    internalId: text("internal_id").primaryKey(),
    runInternalId: text("run_internal_id")
      .notNull()
      .references(() => evalRun.internalId, { onDelete: "cascade" }),
    taskInternalId: text("task_internal_id")
      .notNull()
      .references(() => evalTask.internalId, { onDelete: "restrict" }),
    cellKey: text("cell_key").notNull(),
    harness: text("harness").notNull(),
    harnessVersion: text("harness_version").notNull(),
    model: text("model").notNull(),
    provider: text("provider").notNull(),
    status: text("status").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("eval_cell_run_internal_id_cell_key_idx").on(
      table.runInternalId,
      table.cellKey
    ),
    index("eval_cell_run_internal_id_idx").on(table.runInternalId),
    index("eval_cell_cell_key_idx").on(table.cellKey),
  ]
);

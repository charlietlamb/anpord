import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { evalCell } from "./eval-cells";

/** One execution of a cell, and the atomic unit of work.
 *
 * `voidFields` is a column rather than a flavour of failure. A trial that
 * never ran is not evidence about the harness, and folding it into failed
 * would let a broken provider report a clean pass rate.
 *
 * `modelMs` and `sandboxMs` are separate because a slow provider and a slow
 * model are different findings, and one column cannot tell them apart. */
export const evalTrial = pgTable(
  "eval_trial",
  {
    internalId: text("internal_id").primaryKey(),
    cellInternalId: text("cell_internal_id")
      .notNull()
      .references(() => evalCell.internalId, { onDelete: "cascade" }),
    ordinal: integer("ordinal").notNull(),
    status: text("status").notNull(),
    attempt: integer("attempt").notNull().default(1),
    provider: text("provider").notNull(),
    sandboxId: text("sandbox_id"),
    passed: boolean("passed"),
    exitCode: integer("exit_code"),
    commandCount: integer("command_count"),
    modelMs: integer("model_ms"),
    sandboxMs: integer("sandbox_ms"),
    voidFields: jsonb("void_fields").$type<string[]>(),
    usage: jsonb("usage").$type<Record<string, number>>(),
    failure: text("failure"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    startedAt: timestamp("started_at"),
    finishedAt: timestamp("finished_at"),
  },
  (table) => [
    uniqueIndex("eval_trial_cell_internal_id_ordinal_idx").on(
      table.cellInternalId,
      table.ordinal
    ),
    index("eval_trial_cell_internal_id_idx").on(table.cellInternalId),
    /* Reaping asks for live sandboxes by status, and a partial index keeps
       that cheap as finished trials accumulate. */
    index("eval_trial_status_idx").on(table.status),
  ]
);

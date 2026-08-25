import { sql } from "drizzle-orm";
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
    verifySteps:
      jsonb("verify_steps").$type<{ command: string; exitCode: number }[]>(),
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
    /* Partial, and only over trials that may still hold a sandbox. The
       previous index covered every status and supported no query at all. */
    index("eval_trial_live_sandbox_idx")
      .on(table.status)
      .where(sql`status in ('queued', 'running') and sandbox_id is not null`),
  ]
);

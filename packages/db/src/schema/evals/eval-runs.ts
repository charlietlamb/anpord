import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { organization } from "../auth/organizations";
import { user } from "../auth/users";

export const evalRun = pgTable(
  "eval_run",
  {
    internalId: text("internal_id").primaryKey(),
    id: text("id").notNull(),
    name: text("name"),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    cellCount: integer("cell_count").notNull(),
    trialCount: integer("trial_count").notNull(),
    startedBy: text("started_by").references(() => user.id, {
      onDelete: "set null",
    }),
    /* Why a run ended badly, kept because the in-memory copy is evicted on
       restart and a crashed grid would otherwise be indistinguishable from a
       clean one: evidence of failure read as evidence of success. */
    failure: text("failure"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    startedAt: timestamp("started_at"),
    finishedAt: timestamp("finished_at"),
  },
  (table) => [
    uniqueIndex("eval_run_organization_id_id_idx").on(
      table.organizationId,
      table.id
    ),
    index("eval_run_organization_id_idx").on(table.organizationId),
  ]
);

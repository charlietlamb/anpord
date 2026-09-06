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
    /* Persisted because the in-memory copy is evicted on restart, leaving a crashed grid indistinguishable from a clean one. */
    failure: text("failure"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    finishedAt: timestamp("finished_at"),
  },
  (table) => [
    index("eval_run_started_by_idx").on(table.startedBy),
    uniqueIndex("eval_run_organization_id_id_idx").on(
      table.organizationId,
      table.id
    ),
    index("eval_run_organization_id_created_at_idx").on(
      table.organizationId,
      table.createdAt.desc(),
      table.id.desc()
    ),
  ]
);

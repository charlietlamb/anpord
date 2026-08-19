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
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    cellCount: integer("cell_count").notNull(),
    trialCount: integer("trial_count").notNull(),
    startedBy: text("started_by").references(() => user.id, {
      onDelete: "set null",
    }),
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

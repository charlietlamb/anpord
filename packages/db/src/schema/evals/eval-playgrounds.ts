import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { organization } from "../auth/organizations";
import { user } from "../auth/users";

/* Separate from a run, which must never move. `config` is one document because it is read and written whole, never queried into. */
export const evalPlayground = pgTable(
  "eval_playground",
  {
    internalId: text("internal_id").primaryKey(),
    id: text("id").notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    config: jsonb("config").notNull(),
    /* The pointer moves on each run; the runs it pointed at stay. */
    lastRunId: text("last_run_id"),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("eval_playground_created_by_idx").on(table.createdBy),
    /* Unique: a save updates by (org, id) and returns one row, so duplicates would silently discard work. */
    uniqueIndex("eval_playground_organization_id_id_idx").on(
      table.organizationId,
      table.id
    ),
    index("eval_playground_organization_id_updated_at_idx").on(
      table.organizationId,
      table.updatedAt
    ),
  ]
);

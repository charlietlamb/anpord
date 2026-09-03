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

/**
 * A saved workbench: the cases, the columns and the prompt a person is
 * working on, kept between visits.
 *
 * Separate from a run because it changes for a different reason. A run is a
 * fact about what happened at one moment and must never move; a playground is
 * a draft somebody edits, and it exists before anything has been executed and
 * after every run it produced.
 *
 * `config` is one document rather than child tables. It is read and written
 * whole, never queried into, and a schema decoded at the boundary carries the
 * shape more honestly than five tables joined to reconstruct a form.
 */
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
    /* The run this playground last produced. Braintrust overwrites playground
       results on each run and keeps experiments immutable; the same split
       here, where the pointer moves and the runs it pointed at stay. */
    lastRunId: text("last_run_id"),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    archivedAt: timestamp("archived_at"),
  },
  (table) => [
    index("eval_playground_created_by_idx").on(table.createdBy),
    /* Unique, matching every sibling table. A save updates by (org, id) and
       returns one row; with duplicates it would update several and report
       one, so somebody's work would vanish without an error. */
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

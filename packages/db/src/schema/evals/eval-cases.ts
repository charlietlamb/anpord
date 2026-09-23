import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { organization } from "../auth/organizations";

/* The case itself, which outlives every edit to its definition. An
   eval_case_version row is one version of what this case contained; this row
   is which case it is. */
export const evalCase = pgTable(
  "eval_case",
  {
    internalId: text("internal_id").primaryKey(),
    id: text("id").notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("eval_case_organization_id_id_idx").on(
      table.organizationId,
      table.id
    ),
    index("eval_case_organization_id_created_at_idx").on(
      table.organizationId,
      table.createdAt.desc()
    ),
  ]
);

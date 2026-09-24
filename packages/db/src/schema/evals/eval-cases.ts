import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { organization } from "../auth/organizations";
import { evalSuite } from "./eval-suites";

export const evalCase = pgTable(
  "eval_case",
  {
    internalId: text("internal_id").primaryKey(),
    id: text("id").notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    suiteInternalId: text("suite_internal_id")
      .notNull()
      .references(() => evalSuite.internalId, { onDelete: "restrict" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("eval_case_organization_id_id_idx").on(
      table.organizationId,
      table.id
    ),
    index("eval_case_suite_internal_id_idx").on(table.suiteInternalId),
    index("eval_case_organization_id_created_at_idx").on(
      table.organizationId,
      table.createdAt.desc()
    ),
  ]
);

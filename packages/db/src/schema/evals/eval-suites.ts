import type { EvalSource } from "@anpord/schema/domain/eval-definition";
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { organization } from "../auth/organizations";

export const evalSuite = pgTable(
  "eval_suite",
  {
    internalId: text("internal_id").primaryKey(),
    id: text("id").notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    prompt: text("prompt"),
    source: jsonb("source").$type<EvalSource>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("eval_suite_organization_id_id_idx").on(
      table.organizationId,
      table.id
    ),
    index("eval_suite_organization_id_created_at_idx").on(
      table.organizationId,
      table.createdAt.desc()
    ),
  ]
);

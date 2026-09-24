import type { EvalTrigger } from "@anpord/schema/domain/eval-trigger";
import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { organization } from "../auth/organizations";
import { user } from "../auth/users";

export const evalBatch = pgTable(
  "eval_batch",
  {
    internalId: text("internal_id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    trigger: jsonb("trigger").$type<EvalTrigger>(),
    local: boolean("local").notNull().default(false),
    status: text("status").notNull(),
    failure: text("failure"),
    startedBy: text("started_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    finishedAt: timestamp("finished_at"),
  },
  (table) => [
    index("eval_batch_started_by_idx").on(table.startedBy),
    index("eval_batch_organization_id_created_at_idx").on(
      table.organizationId,
      table.createdAt.desc(),
      table.internalId.desc()
    ),
  ]
);

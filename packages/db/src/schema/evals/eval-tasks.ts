import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { organization } from "../auth/organizations";
import { user } from "../auth/users";

/** A task carries its own verifier, and the bracket that proved the verifier
 * can tell a solved task from an untouched one. A task without a recorded
 * bracket has not been registered, only written. */
export const evalTask = pgTable(
  "eval_task",
  {
    internalId: text("internal_id").primaryKey(),
    id: text("id").notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    suiteId: text("suite_id"),
    name: text("name").notNull(),
    prompt: text("prompt").notNull(),
    repoUrl: text("repo_url"),
    repoRef: text("repo_ref"),
    setupCommand: text("setup_command"),
    verifyCommand: text("verify_command").notNull(),
    workspace: text("workspace").notNull(),
    bracketedAt: timestamp("bracketed_at"),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    archivedAt: timestamp("archived_at"),
  },
  (table) => [
    uniqueIndex("eval_task_organization_id_id_idx").on(
      table.organizationId,
      table.id
    ),
    index("eval_task_organization_id_idx").on(table.organizationId),
  ]
);

import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "../auth/users";
import { prompt } from "./prompts";

/**
 * Append-only. Rows are never updated or deleted, so a version is a stable
 * artifact something in production may still be resolving to.
 */
export const promptVersion = pgTable(
  "prompt_version",
  {
    internalId: text("internal_id").primaryKey(),
    promptInternalId: text("prompt_internal_id")
      .notNull()
      .references(() => prompt.internalId, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    content: text("content").notNull(),
    config: jsonb("config").notNull().default({}),
    commitMessage: text("commit_message"),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("prompt_version_prompt_internal_id_version_idx").on(
      table.promptInternalId,
      table.version
    ),
    index("prompt_version_prompt_internal_id_idx").on(table.promptInternalId),
  ]
);

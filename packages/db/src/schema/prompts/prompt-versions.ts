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
    index("prompt_version_created_by_idx").on(table.createdBy),
    uniqueIndex("prompt_version_prompt_internal_id_version_idx").on(
      table.promptInternalId,
      table.version
    ),
  ]
);

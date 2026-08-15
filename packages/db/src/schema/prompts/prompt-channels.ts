import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "../auth/users";
import { promptVersion } from "./prompt-versions";
import { prompt } from "./prompts";

/**
 * A named address callers resolve against, holding the version it currently
 * points at. Deploying moves one row, so a channel can never resolve to two
 * versions at once. `latest` is derived from max(version) and never stored.
 */
export const promptChannel = pgTable(
  "prompt_channel",
  {
    internalId: text("internal_id").primaryKey(),
    promptInternalId: text("prompt_internal_id")
      .notNull()
      .references(() => prompt.internalId, { onDelete: "cascade" }),
    name: text("name").notNull(),
    versionInternalId: text("version_internal_id")
      .notNull()
      .references(() => promptVersion.internalId, { onDelete: "restrict" }),
    updatedBy: text("updated_by").references(() => user.id, {
      onDelete: "set null",
    }),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("prompt_channel_prompt_internal_id_name_idx").on(
      table.promptInternalId,
      table.name
    ),
    index("prompt_channel_version_internal_id_idx").on(table.versionInternalId),
  ]
);

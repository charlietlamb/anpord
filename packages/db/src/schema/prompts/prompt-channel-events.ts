import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "../auth/users";
import { promptVersion } from "./prompt-versions";
import { prompt } from "./prompts";

/**
 * Deploys, as distinct from edits. `prompt_version` records who wrote a
 * version; this records who put one live and what it replaced.
 */
export const promptChannelEvent = pgTable(
  "prompt_channel_event",
  {
    internalId: text("internal_id").primaryKey(),
    promptInternalId: text("prompt_internal_id")
      .notNull()
      .references(() => prompt.internalId, { onDelete: "cascade" }),
    channel: text("channel").notNull(),
    fromVersionInternalId: text("from_version_internal_id").references(
      () => promptVersion.internalId,
      { onDelete: "set null" }
    ),
    toVersionInternalId: text("to_version_internal_id")
      .notNull()
      .references(() => promptVersion.internalId, { onDelete: "cascade" }),
    actorId: text("actor_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("prompt_channel_event_prompt_internal_id_idx").on(
      table.promptInternalId
    ),
    index("prompt_channel_event_created_at_idx").on(table.createdAt),
  ]
);

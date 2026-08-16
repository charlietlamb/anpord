import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "../auth/users";
import { channel } from "./channels";
import { promptVersion } from "./prompt-versions";
import { prompt } from "./prompts";

export const promptChannel = pgTable(
  "prompt_channel",
  {
    internalId: text("internal_id").primaryKey(),
    promptInternalId: text("prompt_internal_id")
      .notNull()
      .references(() => prompt.internalId, { onDelete: "cascade" }),
    channelInternalId: text("channel_internal_id")
      .notNull()
      .references(() => channel.internalId, { onDelete: "restrict" }),
    versionInternalId: text("version_internal_id")
      .notNull()
      .references(() => promptVersion.internalId, { onDelete: "restrict" }),
    updatedBy: text("updated_by").references(() => user.id, {
      onDelete: "set null",
    }),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("prompt_channel_prompt_internal_id_channel_idx").on(
      table.promptInternalId,
      table.channelInternalId
    ),
    index("prompt_channel_version_internal_id_idx").on(table.versionInternalId),
  ]
);

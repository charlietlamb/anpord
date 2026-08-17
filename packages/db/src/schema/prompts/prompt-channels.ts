import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "../auth/users";
import { channel } from "./channels";
import { promptRelease } from "./prompt-releases";
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
    releaseInternalId: text("release_internal_id")
      .notNull()
      .references(() => promptRelease.internalId, { onDelete: "restrict" }),
    /** The version a pinned release serves, denormalised so listing prompts
     * stays one join rather than a JSON read per row. Null while a rollout is
     * running, because there is no single answer. */
    versionInternalId: text("version_internal_id").references(
      () => promptVersion.internalId,
      { onDelete: "restrict" }
    ),
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

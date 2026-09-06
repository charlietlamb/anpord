import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "../auth/users";
import { promptVersion } from "./prompt-versions";
import { prompt } from "./prompts";

/* One log rather than a table per kind: a reader merging two paged sources cannot know what falls between their pages. Columns only some kinds use are null for the rest. */
export const promptEvent = pgTable(
  "prompt_event",
  {
    internalId: text("internal_id").primaryKey(),
    promptInternalId: text("prompt_internal_id")
      .notNull()
      .references(() => prompt.internalId, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    versionInternalId: text("version_internal_id").references(
      () => promptVersion.internalId,
      { onDelete: "set null" }
    ),
    /* Null except on a channel move, the only kind that names one. */
    channel: text("channel"),
    /* Null on a channel's first move, where there is nowhere to move from. */
    fromVersionInternalId: text("from_version_internal_id").references(
      () => promptVersion.internalId,
      { onDelete: "set null" }
    ),
    actorId: text("actor_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("prompt_event_actor_id_idx").on(table.actorId),
    index("prompt_event_version_internal_id_idx").on(table.versionInternalId),
    index("prompt_event_prompt_internal_id_idx").on(table.promptInternalId),
    /* Paged by the pair, so two events sharing a millisecond cannot be skipped across a page boundary. */
    index("prompt_event_created_at_internal_id_idx").on(
      table.createdAt,
      table.internalId
    ),
  ]
);

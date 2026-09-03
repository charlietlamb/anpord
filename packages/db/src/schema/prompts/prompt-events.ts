import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "../auth/users";
import { promptVersion } from "./prompt-versions";
import { prompt } from "./prompts";

/**
 * Everything that has happened to a prompt, in one log.
 *
 * Saving a version, pointing a channel at one, and rewriting one in place are
 * the same kind of fact to anyone catching up, and splitting them across tables
 * only moves the work of ordering them somewhere less able to do it: a reader
 * merging two paged sources cannot know what falls between their pages.
 *
 * Columns that only some kinds use are null for the rest. Three nullable
 * columns on one log is a smaller cost than a second table, a second endpoint,
 * and a merge in the browser.
 */
export const promptEvent = pgTable(
  "prompt_event",
  {
    internalId: text("internal_id").primaryKey(),
    promptInternalId: text("prompt_internal_id")
      .notNull()
      .references(() => prompt.internalId, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    /** The version the event concerns: saved, overwritten, or moved to. */
    versionInternalId: text("version_internal_id").references(
      () => promptVersion.internalId,
      { onDelete: "set null" }
    ),
    /** Set by a channel move, which is the only kind that names one. */
    channel: text("channel"),
    /** Where the channel pointed before, absent on its first move. */
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
    /* Paged newest first by the pair, so two events sharing a millisecond
       cannot be skipped across a page boundary. */
    index("prompt_event_created_at_internal_id_idx").on(
      table.createdAt,
      table.internalId
    ),
  ]
);

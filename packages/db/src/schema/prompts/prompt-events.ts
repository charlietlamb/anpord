import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "../auth/users";
import { promptVersion } from "./prompt-versions";
import { prompt } from "./prompts";

/**
 * Things that happen to a prompt but move no channel.
 *
 * A channel event is shaped around a move: it requires a channel and a version
 * to arrive at. Overwriting a version has neither, so widening that table would
 * make three of its columns optional and stop its name describing what it
 * holds. This one takes the rest.
 */
export const promptEvent = pgTable(
  "prompt_event",
  {
    internalId: text("internal_id").primaryKey(),
    promptInternalId: text("prompt_internal_id")
      .notNull()
      .references(() => prompt.internalId, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    /** The version the event concerns, where it concerns one. */
    versionInternalId: text("version_internal_id").references(
      () => promptVersion.internalId,
      { onDelete: "cascade" }
    ),
    actorId: text("actor_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("prompt_event_prompt_internal_id_idx").on(table.promptInternalId),
    index("prompt_event_created_at_idx").on(table.createdAt),
  ]
);

import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "../auth/users";
import { prompt } from "./prompts";

/**
 * What a channel points at. A release is either a single version or a rollout
 * that serves two, and it is the unit the channel history records.
 *
 * Append-only, like versions: changing a rollout writes a new row rather than
 * editing one, so "what was production serving on Tuesday" stays answerable
 * and a definition can never be rewritten under a caller mid-request.
 */
export const promptRelease = pgTable(
  "prompt_release",
  {
    internalId: text("internal_id").primaryKey(),
    promptInternalId: text("prompt_internal_id")
      .notNull()
      .references(() => prompt.internalId, { onDelete: "cascade" }),
    /** `pinned` or `rollout`. Kept alongside the definition so a query can
     * filter without reading JSON. */
    kind: text("kind").notNull(),
    definition: jsonb("definition").notNull(),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("prompt_release_created_by_idx").on(table.createdBy),
    index("prompt_release_prompt_internal_id_idx").on(table.promptInternalId),
  ]
);

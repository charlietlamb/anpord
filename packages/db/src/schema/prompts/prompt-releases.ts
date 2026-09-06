import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "../auth/users";
import { prompt } from "./prompts";

/* Append-only: changing a rollout writes a new row, so history stays answerable and no definition is rewritten under a caller mid-request. */
export const promptRelease = pgTable(
  "prompt_release",
  {
    internalId: text("internal_id").primaryKey(),
    promptInternalId: text("prompt_internal_id")
      .notNull()
      .references(() => prompt.internalId, { onDelete: "cascade" }),
    /* Kept alongside the definition so a query can filter without reading JSON. */
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

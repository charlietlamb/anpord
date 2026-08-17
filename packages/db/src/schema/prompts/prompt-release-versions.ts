import { index, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { promptRelease } from "./prompt-releases";
import { promptVersion } from "./prompt-versions";

/**
 * Every version a release can serve. `prompt_channel.version_internal_id`
 * guards the pinned case, and this guards the rest: a version a rollout still
 * serves cannot be deleted, and the database enforces it rather than the
 * application remembering to read the definition.
 */
export const promptReleaseVersion = pgTable(
  "prompt_release_version",
  {
    releaseInternalId: text("release_internal_id")
      .notNull()
      .references(() => promptRelease.internalId, { onDelete: "cascade" }),
    versionInternalId: text("version_internal_id")
      .notNull()
      .references(() => promptVersion.internalId, { onDelete: "restrict" }),
  },
  (table) => [
    uniqueIndex("prompt_release_version_release_version_idx").on(
      table.releaseInternalId,
      table.versionInternalId
    ),
    index("prompt_release_version_version_internal_id_idx").on(
      table.versionInternalId
    ),
  ]
);

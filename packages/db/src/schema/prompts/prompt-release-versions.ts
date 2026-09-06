import { index, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { promptRelease } from "./prompt-releases";
import { promptVersion } from "./prompt-versions";

/* Guards the rollout case the way `prompt_channel.version_internal_id` guards the pinned one, so the database refuses the delete rather than the application remembering to. */
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

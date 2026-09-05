import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { organization } from "../auth/organizations";

/**
 * A GitHub App installation, which is what clones a private repository.
 *
 * Held against the organization rather than the person who installed it: an
 * installation belongs to a GitHub account and keeps working when whoever set
 * it up leaves, which is the whole reason for preferring an App over a user's
 * OAuth token.
 */
export const githubInstallation = pgTable(
  "github_installation",
  {
    /* GitHub's own installation id. It is the identifier every API call
       needs, and one account installs an app once, so it doubles as the key
       rather than being carried beside one of ours. */
    id: integer("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    /** The GitHub account the app is installed on, shown to the reader. */
    accountLogin: text("account_login").notNull(),
    /** "all" or "selected", which is what tells a reader whether the picker
     * has anything left to choose. */
    repositorySelection: text("repository_selection").notNull(),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => [index("github_installation_org_idx").on(table.organizationId)]
);

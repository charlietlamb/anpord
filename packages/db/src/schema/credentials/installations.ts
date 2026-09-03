import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { organization } from "../auth/organizations";
import { user } from "../auth/users";

/**
 * A GitHub App installation, which is what clones a private repository.
 *
 * Held against the organization rather than the person who installed it: an
 * installation belongs to a GitHub account and keeps working when whoever set
 * it up leaves, which is the whole reason for preferring an App over a user's
 * OAuth token. `installedByUserId` is kept for the audit trail only, and is
 * nulled rather than cascading the installation away with the member.
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
    installedByUserId: text("installed_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => [
    index("github_installation_org_idx").on(table.organizationId),
    index("github_installation_installed_by_user_id_idx").on(
      table.installedByUserId
    ),
  ]
);

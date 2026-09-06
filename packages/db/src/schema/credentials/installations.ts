import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { organization } from "../auth/organizations";

/* Held against the organization, not the installer, so it keeps working when they leave. */
export const githubInstallation = pgTable(
  "github_installation",
  {
    /* GitHub's own id, unique per account and needed by every API call, so it doubles as the key. */
    id: integer("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    accountLogin: text("account_login").notNull(),
    /* "all" or "selected". */
    repositorySelection: text("repository_selection").notNull(),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => [index("github_installation_org_idx").on(table.organizationId)]
);

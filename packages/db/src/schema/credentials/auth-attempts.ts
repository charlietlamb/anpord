import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { organization } from "../auth/organizations";
import { user } from "../auth/users";

export const credentialAuthAttempt = pgTable(
  "credential_auth_attempt",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    integrationId: text("integration_id").notNull(),
    authMethodId: text("auth_method_id").notNull(),
    status: text("status").notNull(),
    sealedState: text("sealed_state").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("credential_auth_attempt_organization_user_status_idx").on(
      table.organizationId,
      table.userId,
      table.status
    ),
  ]
);

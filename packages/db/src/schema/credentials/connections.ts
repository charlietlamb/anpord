import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { organization } from "../auth/organizations";
import { user } from "../auth/users";

export const credentialConnection = pgTable(
  "credential_connection",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    integrationId: text("integration_id").notNull(),
    authMethodId: text("auth_method_id").notNull(),
    scope: text("scope").notNull(),
    ownerUserId: text("owner_user_id").references(() => user.id, {
      onDelete: "cascade",
    }),
    name: text("name").notNull(),
    status: text("status").notNull(),
    sealedPayload: text("sealed_payload").notNull(),
    revision: integer("revision").notNull().default(1),
    isDefault: boolean("is_default").notNull().default(false),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    lastVerifiedAt: timestamp("last_verified_at"),
    lastUsedAt: timestamp("last_used_at"),
  },
  (table) => [
    uniqueIndex("credential_connection_organization_name_idx")
      .on(table.organizationId, table.integrationId, table.name)
      .where(sql`${table.scope} = 'organization'`),
    uniqueIndex("credential_connection_personal_name_idx")
      .on(
        table.organizationId,
        table.ownerUserId,
        table.integrationId,
        table.name
      )
      .where(sql`${table.scope} = 'personal'`),
    uniqueIndex("credential_connection_organization_default_idx")
      .on(table.organizationId, table.integrationId)
      .where(sql`${table.scope} = 'organization' and ${table.isDefault}`),
    uniqueIndex("credential_connection_personal_default_idx")
      .on(table.organizationId, table.ownerUserId, table.integrationId)
      .where(sql`${table.scope} = 'personal' and ${table.isDefault}`),
    index("credential_connection_resolve_idx").on(
      table.organizationId,
      table.integrationId,
      table.status,
      table.isDefault
    ),
  ]
);

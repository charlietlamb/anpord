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

export const environmentVariable = pgTable(
  "environment_variable",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    scope: text("scope").notNull(),
    ownerUserId: text("owner_user_id").references(() => user.id, {
      onDelete: "cascade",
    }),
    name: text("name").notNull(),
    secret: boolean("secret").notNull().default(true),
    sealedValue: text("sealed_value").notNull(),
    preview: text("preview").notNull(),
    revision: integer("revision").notNull().default(1),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    lastUsedAt: timestamp("last_used_at"),
  },
  (table) => [
    index("environment_variable_created_by_idx").on(table.createdBy),
    index("environment_variable_owner_user_id_idx").on(table.ownerUserId),
    uniqueIndex("environment_variable_organization_name_idx")
      .on(table.organizationId, table.name)
      .where(sql`${table.scope} = 'organization'`),
    uniqueIndex("environment_variable_personal_name_idx")
      .on(table.organizationId, table.ownerUserId, table.name)
      .where(sql`${table.scope} = 'personal'`),
  ]
);

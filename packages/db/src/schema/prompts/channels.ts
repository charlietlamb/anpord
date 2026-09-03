import { sql } from "drizzle-orm";
import {
  boolean,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { organization } from "../auth/organizations";

/** Channels belong to the organisation rather than to a prompt, so renaming or
 * recolouring one is a single act rather than an edit repeated per prompt. */
export const channel = pgTable(
  "channel",
  {
    internalId: text("internal_id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").notNull(),
    /** Which channel answers a request that names none. */
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("channel_organization_id_name_idx").on(
      table.organizationId,
      table.name
    ),
    /** Partial, so an organisation may hold one default or none at all. */
    uniqueIndex("channel_one_default_idx")
      .on(table.organizationId)
      .where(sql`${table.isDefault}`),
  ]
);

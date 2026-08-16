import {
  index,
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
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("channel_organization_id_name_idx").on(
      table.organizationId,
      table.name
    ),
    index("channel_organization_id_idx").on(table.organizationId),
  ]
);

import {
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { organization } from "../auth/organizations";

/* The version is a content hash, so an edit writes a new row rather than changing this one. */
export const evalHarnessProfile = pgTable(
  "eval_harness_profile",
  {
    internalId: text("internal_id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    version: text("version").notNull(),
    base: text("base").notNull(),
    files: jsonb("files").$type<Record<string, string>>().notNull(),
    systemPrompt: text("system_prompt"),
    env: jsonb("env").$type<Record<string, string>>(),
    install: text("install"),
    run: text("run"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("eval_harness_profile_organization_id_name_version_idx").on(
      table.organizationId,
      table.name,
      table.version
    ),
  ]
);

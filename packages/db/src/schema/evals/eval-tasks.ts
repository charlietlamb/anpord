import { sql } from "drizzle-orm";
import {
  check,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { organization } from "../auth/organizations";
import { user } from "../auth/users";

export const evalTask = pgTable(
  "eval_task",
  {
    internalId: text("internal_id").primaryKey(),
    id: text("id").notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    prompt: text("prompt").notNull(),
    sourceKind: text("source_kind").$type<"empty" | "files" | "repo">(),
    sourceFiles: jsonb("source_files").$type<Record<string, string>>(),
    repoUrl: text("repo_url"),
    repoRef: text("repo_ref"),
    prepareName: text("prepare_name"),
    prepareSource: text("prepare_source"),
    validatorName: text("validator_name"),
    validatorSource: text("validator_source"),
    /* What a prepare builds that is worth keeping between runs of this case.
       Stored because a worker rebuilds the case from here, so a declaration
       that lives only in the request is one no dispatched run ever sees. */
    cacheKey: text("cache_key"),
    cachePath: text("cache_path"),
    verifyCommand: text("verify_command"),
    workspace: text("workspace").notNull(),
    bracketedAt: timestamp("bracketed_at"),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    archivedAt: timestamp("archived_at"),
  },
  (table) => [
    index("eval_task_created_by_idx").on(table.createdBy),
    uniqueIndex("eval_task_organization_id_id_idx").on(
      table.organizationId,
      table.id
    ),
    check(
      "eval_task_source_kind_check",
      sql`${table.sourceKind} in ('empty', 'files', 'repo')`
    ),
  ]
);

import type { EvalUser } from "@anpord/schema/domain/eval-turns";
import type { EvalValidator } from "@anpord/schema/domain/evals";
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
import { evalCase } from "./eval-cases";

export const evalCaseVersion = pgTable(
  "eval_case_version",
  {
    internalId: text("internal_id").primaryKey(),
    caseInternalId: text("case_internal_id")
      .notNull()
      .references(() => evalCase.internalId, { onDelete: "restrict" }),
    definitionHash: text("definition_hash").notNull(),
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
    validatorConfig: jsonb("validator_config").$type<EvalValidator>(),
    user: jsonb("user").$type<EvalUser>(),
    /* Deliberately outside the case identity: a case retagged is the same
       measurement, and hashing these would orphan every baseline behind it. */
    tags: jsonb("tags").$type<readonly string[]>(),
    /* Stored because a worker rebuilds the case from here, never from the request. */
    cacheKey: text("cache_key"),
    cachePath: text("cache_path"),
    verifyCommand: text("verify_command"),
    workspace: text("workspace").notNull(),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("eval_case_version_created_by_idx").on(table.createdBy),
    uniqueIndex("eval_case_version_case_internal_id_definition_hash_idx").on(
      table.caseInternalId,
      table.definitionHash
    ),
    index("eval_case_version_case_internal_id_idx").on(table.caseInternalId),
    check(
      "eval_case_version_source_kind_check",
      sql`${table.sourceKind} in ('empty', 'files', 'repo')`
    ),
  ]
);

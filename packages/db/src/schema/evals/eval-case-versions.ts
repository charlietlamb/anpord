import type { EvalUser } from "@anpord/schema/domain/eval-turns";
import type {
  CaseCache,
  EvalPrepare,
  EvalSource,
  EvalValidator,
} from "@anpord/schema/domain/evals";
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "../auth/users";
import { evalCase } from "./eval-cases";

export const evalCaseVersion = pgTable(
  "eval_case_version",
  {
    internalId: text("internal_id").primaryKey(),
    caseInternalId: text("case_internal_id")
      .notNull()
      .references(() => evalCase.internalId, { onDelete: "cascade" }),
    definitionHash: text("definition_hash").notNull(),
    prompt: text("prompt").notNull(),
    source: jsonb("source").$type<EvalSource>().notNull(),
    prepare: jsonb("prepare").$type<EvalPrepare>(),
    validator: jsonb("validator").$type<EvalValidator>(),
    verify: text("verify"),
    user: jsonb("user").$type<EvalUser>(),
    cache: jsonb("cache").$type<CaseCache>(),
    tags: jsonb("tags").$type<readonly string[]>().notNull().default([]),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("eval_case_version_case_internal_id_definition_hash_idx").on(
      table.caseInternalId,
      table.definitionHash
    ),
    index("eval_case_version_created_by_idx").on(table.createdBy),
  ]
);

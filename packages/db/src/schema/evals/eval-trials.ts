import type { EvalValidation } from "@anpord/schema/domain/eval-validations";
import type {
  EvalArtifactMetadata,
  EvalVerifyStep,
} from "@anpord/schema/domain/evals";
import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { evalRun } from "./eval-runs";

export const evalTrial = pgTable(
  "eval_trial",
  {
    internalId: text("internal_id").primaryKey(),
    runInternalId: text("run_internal_id")
      .notNull()
      .references(() => evalRun.internalId, { onDelete: "cascade" }),
    ordinal: integer("ordinal").notNull(),
    status: text("status").notNull(),
    sandboxId: text("sandbox_id"),
    exitCode: integer("exit_code"),
    commandCount: integer("command_count"),
    modelMs: integer("model_ms"),
    sandboxMs: integer("sandbox_ms"),
    artifacts: jsonb("artifacts").$type<readonly EvalArtifactMetadata[]>(),
    validations: jsonb("validations").$type<readonly EvalValidation[]>(),
    voidFields: jsonb("void_fields").$type<readonly string[]>(),
    verifySteps: jsonb("verify_steps").$type<readonly EvalVerifyStep[]>(),
    usage: jsonb("usage").$type<Record<string, number>>(),
    failure: text("failure"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    startedAt: timestamp("started_at"),
    finishedAt: timestamp("finished_at"),
  },
  (table) => [
    uniqueIndex("eval_trial_run_internal_id_ordinal_idx").on(
      table.runInternalId,
      table.ordinal
    ),
    index("eval_trial_live_sandbox_idx")
      .on(table.startedAt)
      .where(sql`sandbox_id is not null`),
  ]
);

import { sql } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { credentialConnection } from "../credentials/connections";
import { evalHarnessProfile } from "./eval-harness-profiles";
import { evalRun } from "./eval-runs";
import { evalTask } from "./eval-tasks";

export const evalCell = pgTable(
  "eval_cell",
  {
    internalId: text("internal_id").primaryKey(),
    runInternalId: text("run_internal_id")
      .notNull()
      .references(() => evalRun.internalId, { onDelete: "cascade" }),
    taskInternalId: text("task_internal_id")
      .notNull()
      .references(() => evalTask.internalId, { onDelete: "restrict" }),
    cellKey: text("cell_key").notNull(),
    harness: text("harness").notNull(),
    harnessCredentialConnectionId: text(
      "harness_credential_connection_id"
    ).references(() => credentialConnection.id, { onDelete: "set null" }),
    harnessCredentialRevision: integer("harness_credential_revision"),
    harnessVersion: text("harness_version").notNull(),
    model: text("model").notNull(),
    /* Restricted like the task: a profile a cell ran under is part of what
       the cell measured, and cannot go while the reading stands. */
    profileInternalId: text("profile_internal_id").references(
      () => evalHarnessProfile.internalId,
      { onDelete: "restrict" }
    ),
    prompt: text("prompt").notNull(),
    provider: text("provider").notNull(),
    sandboxCredentialConnectionId: text(
      "sandbox_credential_connection_id"
    ).references(() => credentialConnection.id, { onDelete: "set null" }),
    sandboxCredentialRevision: integer("sandbox_credential_revision"),
    status: text("status").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("eval_cell_harness_credential_connection_id_idx").on(
      table.harnessCredentialConnectionId
    ),
    index("eval_cell_sandbox_credential_connection_id_idx").on(
      table.sandboxCredentialConnectionId
    ),
    uniqueIndex("eval_cell_run_internal_id_cell_key_idx").on(
      table.runInternalId,
      table.cellKey
    ),

    index("eval_cell_cell_key_created_at_idx").on(
      table.cellKey,
      table.createdAt.desc()
    ),
    index("eval_cell_task_internal_id_idx").on(table.taskInternalId),
    index("eval_cell_profile_internal_id_idx")
      .on(table.profileInternalId)
      .where(sql`"profile_internal_id" IS NOT NULL`),
  ]
);

import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { credentialConnection } from "../credentials/connections";
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
    uniqueIndex("eval_cell_run_internal_id_cell_key_idx").on(
      table.runInternalId,
      table.cellKey
    ),

    index("eval_cell_cell_key_created_at_idx").on(
      table.cellKey,
      table.createdAt.desc()
    ),
    index("eval_cell_task_internal_id_idx").on(table.taskInternalId),
  ]
);

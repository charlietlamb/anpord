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
import { evalBatch } from "./eval-batches";
import { evalCaseVersion } from "./eval-case-versions";
import { evalHarnessProfile } from "./eval-harness-profiles";
import { evalVariant } from "./eval-variants";

export const evalRun = pgTable(
  "eval_run",
  {
    internalId: text("internal_id").primaryKey(),
    batchInternalId: text("batch_internal_id")
      .notNull()
      .references(() => evalBatch.internalId, { onDelete: "cascade" }),
    variantInternalId: text("variant_internal_id")
      .notNull()
      .references(() => evalVariant.internalId, { onDelete: "restrict" }),
    caseVersionInternalId: text("case_version_internal_id")
      .notNull()
      .references(() => evalCaseVersion.internalId, { onDelete: "restrict" }),
    profileInternalId: text("profile_internal_id").references(
      () => evalHarnessProfile.internalId,
      { onDelete: "restrict" }
    ),
    harnessVersion: text("harness_version").notNull(),
    harnessCredentialConnectionId: text(
      "harness_credential_connection_id"
    ).references(() => credentialConnection.id, { onDelete: "set null" }),
    harnessCredentialRevision: integer("harness_credential_revision"),
    sandboxCredentialConnectionId: text(
      "sandbox_credential_connection_id"
    ).references(() => credentialConnection.id, { onDelete: "set null" }),
    sandboxCredentialRevision: integer("sandbox_credential_revision"),
    trialCount: integer("trial_count").notNull(),
    status: text("status").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    finishedAt: timestamp("finished_at"),
  },
  (table) => [
    uniqueIndex("eval_run_batch_internal_id_variant_internal_id_idx").on(
      table.batchInternalId,
      table.variantInternalId
    ),
    index("eval_run_variant_internal_id_created_at_idx").on(
      table.variantInternalId,
      table.createdAt.desc()
    ),
    index("eval_run_case_version_internal_id_idx").on(
      table.caseVersionInternalId
    ),
    index("eval_run_harness_credential_connection_id_idx").on(
      table.harnessCredentialConnectionId
    ),
    index("eval_run_sandbox_credential_connection_id_idx").on(
      table.sandboxCredentialConnectionId
    ),
    index("eval_run_profile_internal_id_idx")
      .on(table.profileInternalId)
      .where(sql`"profile_internal_id" IS NOT NULL`),
  ]
);

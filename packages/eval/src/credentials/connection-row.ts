import type { credentialConnection } from "@anpord/db/schema/credentials/connections";
import { CredentialConnection } from "@anpord/schema/domain/credentials";
import { Schema } from "effect";
import { timestamp } from "../repositories/run-view";

export type ConnectionRow = typeof credentialConnection.$inferSelect;

export const summaryOf = (row: ConnectionRow): CredentialConnection =>
  Schema.validateSync(CredentialConnection)({
    authMethodId: row.authMethodId,
    createdAt: timestamp(row.createdAt),
    id: row.id,
    integrationId: row.integrationId,
    isDefault: row.isDefault,
    lastUsedAt: timestamp(row.lastUsedAt),
    name: row.name,
    scope: row.scope,
    status: row.status,
  });

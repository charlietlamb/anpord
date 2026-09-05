import type { credentialConnection } from "@anpord/db/schema/credentials/connections";
import { CredentialConnection } from "@anpord/schema/domain/credentials";
import { DateTime, Schema } from "effect";

export type ConnectionRow = typeof credentialConnection.$inferSelect;

export const summaryOf = (row: ConnectionRow): CredentialConnection =>
  Schema.validateSync(CredentialConnection)({
    authMethodId: row.authMethodId,
    createdAt: DateTime.unsafeMake(row.createdAt.getTime()),
    id: row.id,
    integrationId: row.integrationId,
    isDefault: row.isDefault,
    lastUsedAt:
      row.lastUsedAt === null
        ? null
        : DateTime.unsafeMake(row.lastUsedAt.getTime()),
    name: row.name,
    scope: row.scope,
    status: row.status,
  });

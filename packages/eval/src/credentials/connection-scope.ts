import { credentialConnection } from "@anpord/db/schema/credentials/connections";
import { and, eq, or } from "drizzle-orm";

export const visibleTo = (organizationId: string, userId: string) =>
  and(
    eq(credentialConnection.organizationId, organizationId),
    or(
      eq(credentialConnection.scope, "organization"),
      and(
        eq(credentialConnection.scope, "personal"),
        eq(credentialConnection.ownerUserId, userId)
      )
    )
  );

export const defaultScope = (
  organizationId: string,
  userId: string,
  integrationId: string,
  scope: string
) =>
  and(
    eq(credentialConnection.organizationId, organizationId),
    eq(credentialConnection.integrationId, integrationId),
    eq(credentialConnection.scope, scope),
    scope === "personal"
      ? eq(credentialConnection.ownerUserId, userId)
      : undefined
  );

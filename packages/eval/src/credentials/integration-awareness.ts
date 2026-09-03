import type { IntegrationAwareness } from "@anpord/schema/domain/credentials";

/** Rows arrive sorted by integration then name, so one pass groups them. */
export const groupOwners = (
  rows: readonly { integrationId: string; owner: string }[]
): readonly IntegrationAwareness[] => {
  const byIntegration = new Map<string, string[]>();

  for (const row of rows) {
    const owners = byIntegration.get(row.integrationId);

    if (owners === undefined) {
      byIntegration.set(row.integrationId, [row.owner]);
    } else {
      owners.push(row.owner);
    }
  }

  return [...byIntegration].map(([integrationId, owners]) => ({
    integrationId,
    owners,
  }));
};

import { seedTenant } from "@anpord/e2e/src/harness/seed";
import { sessionCookie } from "./server";

export interface PerfTenant {
  readonly apiKey: string;
  readonly cookie: string;
  readonly organizationId: string;
  readonly sessionToken: string;
}

const mintKey = async (
  baseUrl: string,
  cookie: string,
  organizationId: string
) => {
  const response = await fetch(`${baseUrl}/api/auth/api-key/create`, {
    body: JSON.stringify({ name: "perf", organizationId }),
    headers: {
      "content-type": "application/json",
      cookie,
      origin: baseUrl,
    },
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(
      `Could not mint a perf key (${response.status}): ${await response.text()}`
    );
  }
  return ((await response.json()) as { readonly key: string }).key;
};

export const givenTenant = async (
  databaseUrl: string,
  baseUrl: string,
  slug: string
): Promise<PerfTenant> => {
  const tenant = await seedTenant(databaseUrl, slug);
  const cookie = await sessionCookie(tenant.sessionToken);
  return {
    apiKey: await mintKey(baseUrl, cookie, tenant.organizationId),
    cookie,
    organizationId: tenant.organizationId,
    sessionToken: tenant.sessionToken,
  };
};

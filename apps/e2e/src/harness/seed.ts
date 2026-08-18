import { randomUUID } from "node:crypto";
import { Client } from "pg";

export interface Tenant {
  readonly organizationId: string;
  readonly organizationName: string;
  readonly sessionToken: string;
  readonly userEmail: string;
  readonly userId: string;
}

/** Minting a key needs a signed-in person, and the sign-in itself is a magic
 * link to a mailbox nothing here owns, so a session is seeded directly. */
const SESSION_DAYS = 7;
const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;

const OWNER = "owner";

/**
 * Seeded straight through SQL rather than the sign-up flow. A magic link needs
 * a mailbox, and the scenarios are about prompts, not about how somebody got
 * their session.
 */
export const seedTenant = async (
  connectionString: string,
  name: string
): Promise<Tenant> => {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    const userId = randomUUID();
    const organizationId = randomUUID();
    const memberId = randomUUID();
    const userEmail = `${name}@e2e.anpord.test`;
    const now = new Date();

    await client.query(
      `insert into "user" (id, name, email, email_verified, created_at, updated_at)
       values ($1, $2, $3, true, $4, $4)`,
      [userId, `${name} owner`, userEmail, now]
    );

    await client.query(
      `insert into organization (id, name, slug, created_at)
       values ($1, $2, $3, $4)`,
      [organizationId, `${name} org`, name, now]
    );

    await client.query(
      `insert into member (id, organization_id, user_id, role, created_at)
       values ($1, $2, $3, $4, $5)`,
      [memberId, organizationId, userId, OWNER, now]
    );

    /* The same channel signing up gives a new organisation. Without it the
       test organisations are a shape no real one has: no default, so nothing
       exercises the resolution path every customer actually takes. */
    await client.query(
      `insert into channel
         (internal_id, organization_id, name, color, is_default, created_at)
       values ($1, $2, 'production', 'green', true, $3)`,
      [`chl_${randomUUID().replaceAll("-", "")}`, organizationId, now]
    );

    const sessionToken = randomUUID();
    await client.query(
      `insert into session
         (id, token, user_id, active_organization_id, expires_at, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, $6)`,
      [
        randomUUID(),
        sessionToken,
        userId,
        organizationId,
        new Date(now.getTime() + SESSION_DAYS * MILLIS_PER_DAY),
        now,
      ]
    );

    return {
      organizationId,
      organizationName: `${name} org`,
      sessionToken,
      userEmail,
      userId,
    };
  } finally {
    await client.end();
  }
};

#!/usr/bin/env bun

import { randomUUID } from "node:crypto";
import { Client } from "pg";

/*
  Mints an API key for an organization you already own, through the same
  endpoint the dashboard calls.

  A key is shown once and never again, so this exists to get one for a test run
  without clicking through the dashboard. It creates a short-lived session for a
  member of the organization rather than a user of its own, so the key is
  attributed to a real person and revoking that person revokes this path.

    bun run scripts/mint-api-key.ts --org "manu-test"
    bun run scripts/mint-api-key.ts --org "manu-test" --name ci --days 7

  DATABASE_URL and BETTER_AUTH_SECRET name the deployment it acts on. For
  production both live in AWS Secrets Manager:

    export BETTER_AUTH_SECRET=$(aws secretsmanager get-secret-value \
      --secret-id anpord/server/BETTER_AUTH_SECRET --query SecretString --output text)
    export DATABASE_URL=$(aws secretsmanager get-secret-value \
      --secret-id anpord/server/DATABASE_URL --query SecretString --output text)
*/

const SESSION_MINUTES = 10;
const MILLIS_PER_MINUTE = 60_000;

const arg = (flag: string) => {
  const at = process.argv.indexOf(`--${flag}`);

  return at === -1 ? undefined : process.argv[at + 1];
};

const required = (name: string) => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not set`);
  }

  return value;
};

const signed = async (token: string, secret: string) => {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(token)
  );

  return `${token}.${btoa(String.fromCharCode(...new Uint8Array(signature)))}`;
};

const organization = arg("org");

if (organization === undefined) {
  throw new Error(
    'Name the organization: --org "manu-test". Use its name or its slug.'
  );
}

const label = arg("name") ?? "test";
const baseUrl = process.env.ANPORD_SERVER_URL ?? "https://api.anpord.com";
/* Better Auth checks the origin against its trusted list, which names the web
   app rather than the API. */
const origin = process.env.ANPORD_WEB_URL ?? "https://www.anpord.com";
/* Better Auth prefixes the cookie with __Secure- once it is served over https. */
const cookieName = baseUrl.startsWith("https:")
  ? "__Secure-anpord.session_token"
  : "anpord.session_token";
const secret = required("BETTER_AUTH_SECRET");
const db = new Client({ connectionString: required("DATABASE_URL") });
await db.connect();

const { rows } = await db.query(
  `select m.user_id as "userId", o.id as "organizationId", o.name, u.email
     from organization o
     join member m on m.organization_id = o.id
     join "user" u on u.id = m.user_id
    where o.name = $1 or o.slug = $1
    order by case m.role when 'owner' then 0 else 1 end
    limit 1`,
  [organization]
);
const owner = rows[0];

if (owner === undefined) {
  throw new Error(
    `No organization named "${organization}", or it has no members. Create it in the dashboard first.`
  );
}

const token = randomUUID();
const now = new Date();
const expiresAt = new Date(now.getTime() + SESSION_MINUTES * MILLIS_PER_MINUTE);

await db.query(
  `insert into session (id, token, user_id, active_organization_id, expires_at, created_at, updated_at)
   values ($1, $2, $3, $4, $5, $6, $6)`,
  [randomUUID(), token, owner.userId, owner.organizationId, expiresAt, now]
);

try {
  const response = await fetch(`${baseUrl}/api/auth/api-key/create`, {
    body: JSON.stringify({
      name: `${label}-${now.toISOString().slice(0, 10)}`,
      organizationId: owner.organizationId,
    }),
    headers: {
      cookie: `${cookieName}=${await signed(token, secret)}`,
      "content-type": "application/json",
      origin,
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(
      `${baseUrl} refused the key: ${response.status} ${await response.text()}`
    );
  }

  const { key } = (await response.json()) as { key: string };

  process.stderr.write(
    `Minted for ${owner.name} as ${owner.email}. Shown once.\n`
  );
  process.stdout.write(`${key}\n`);
} finally {
  /* The session existed only to authenticate that one call. */
  await db.query("delete from session where token = $1", [token]);
  await db.end();
}

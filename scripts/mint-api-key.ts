#!/usr/bin/env bun

import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { signSessionCookie } from "../packages/auth/src/session/sign-session-cookie";
import { SESSION_COOKIE } from "../packages/schema/src/internal/authentication";
import { API_ORIGIN, WEB_ORIGIN } from "../packages/schema/src/public/origins";
import { arg, required } from "./lib/cli-args";

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
      --secret-id sphynx/server/BETTER_AUTH_SECRET --query SecretString --output text)
    export DATABASE_URL=$(aws secretsmanager get-secret-value \
      --secret-id sphynx/server/DATABASE_URL --query SecretString --output text)
*/

const SESSION_MINUTES = 10;
const MILLIS_PER_MINUTE = 60_000;

const organization = arg("org");

if (organization === undefined) {
  throw new Error(
    'Name the organization: --org "manu-test". Use its name or its slug.'
  );
}

const label = arg("name") ?? "test";
const baseUrl = process.env.SPHYNX_SERVER_URL ?? API_ORIGIN;
/* Better Auth checks the origin against its trusted list, which names the web
   app rather than the API. */
const origin = process.env.SPHYNX_WEB_URL ?? WEB_ORIGIN;
/* Better Auth prefixes the cookie with __Secure- once it is served over https. */
const cookieName = baseUrl.startsWith("https:")
  ? `__Secure-${SESSION_COOKIE}`
  : SESSION_COOKIE;
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
      cookie: `${cookieName}=${await signSessionCookie(token, secret)}`,
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

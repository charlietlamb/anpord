#!/usr/bin/env bun

import { randomUUID } from "node:crypto";
import { Client } from "pg";

/*
  Creates a local organization with an owner, so there is something to mint a
  key against without clicking through the dashboard.

  Re-running with the same slug returns what already exists rather than adding
  a second copy, so it is safe to put in a setup script.

    bun run scripts/test-org.ts
    bun run scripts/test-org.ts --slug my-tests --email me@example.test

  It refuses to touch anything but a local database, because it writes a user
  that never verified an email and can sign nothing.
*/

const arg = (flag: string) => {
  const at = process.argv.indexOf(`--${flag}`);

  return at === -1 ? undefined : process.argv[at + 1];
};

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost"]);

const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error("DATABASE_URL is not set");
}

if (!LOCAL_HOSTS.has(new URL(url).hostname)) {
  throw new Error(
    `${new URL(url).hostname} is not a local database. This writes an unverified user, so it only runs against localhost.`
  );
}

const slug = arg("slug") ?? "local-tests";
const email = arg("email") ?? `${slug}@local.test`;
const name = arg("name") ?? "Local Tests";

const db = new Client({ connectionString: url });
await db.connect();

try {
  const existing = await db.query(
    `select o.id as "organizationId", o.slug, u.email
       from organization o
       join member m on m.organization_id = o.id
       join "user" u on u.id = m.user_id
      where o.slug = $1
      limit 1`,
    [slug]
  );

  if (existing.rows[0] === undefined) {
    const now = new Date();
    const userId = randomUUID();
    const organizationId = randomUUID();

    await db.query(
      `insert into "user" (id, name, email, email_verified, created_at, updated_at)
       values ($1, $2, $3, true, $4, $4)`,
      [userId, name, email, now]
    );

    await db.query(
      `insert into organization (id, name, slug, created_at)
       values ($1, $2, $3, $4)`,
      [organizationId, name, slug, now]
    );

    await db.query(
      `insert into member (id, organization_id, user_id, role, created_at)
       values ($1, $2, $3, 'owner', $4)`,
      [randomUUID(), organizationId, userId, now]
    );

    process.stderr.write(`Created ${slug} owned by ${email}.\n`);
    process.stdout.write(`${slug}\n`);
  } else {
    const found = existing.rows[0];

    process.stderr.write(`Already there: ${found.slug} (${found.email}).\n`);
    process.stdout.write(`${found.slug}\n`);
  }
} finally {
  await db.end();
}

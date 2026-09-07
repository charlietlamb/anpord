#!/usr/bin/env bun

import { randomUUID } from "node:crypto";
import { Client } from "pg";

/*
  Copies a credential connection from one organization to another, creating the
  destination organization when it does not exist.

  A sealed payload is bound to its organization, connection id and integration
  through the cipher's authenticated context, so a row copied as-is will not
  decrypt. This opens it with the source context and seals it again with the
  destination's.

    bun run scripts/copy-connection.ts --from "Testy" --to "manu-test" --integration codex

  DATABASE_URL and BETTER_AUTH_SECRET name the deployment. For production both
  live in AWS Secrets Manager under anpord/server/.
*/

const encoder = new TextEncoder();
const decoder = new TextDecoder();

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

const bytes = (value: string) =>
  Uint8Array.from(Buffer.from(value, "base64url"));

const base64 = (value: ArrayBuffer) => Buffer.from(value).toString("base64url");

const contextOf = (row: {
  id: string;
  integrationId: string;
  organizationId: string;
}) => `${row.organizationId}\0${row.id}\0${row.integrationId}`;

const cipherKey = async (secret: string) =>
  crypto.subtle.importKey(
    "raw",
    await crypto.subtle.digest("SHA-256", encoder.encode(secret)),
    "AES-GCM",
    false,
    ["encrypt", "decrypt"]
  );

const from = arg("from");
const to = arg("to");
const integration = arg("integration") ?? "codex";

if (from === undefined || to === undefined) {
  throw new Error(
    'Name both sides: --from "Testy" --to "manu-test" [--integration codex]'
  );
}

const key = await cipherKey(required("BETTER_AUTH_SECRET"));
const db = new Client({ connectionString: required("DATABASE_URL") });
await db.connect();

const source = (
  await db.query(
    `select c.id, c.organization_id as "organizationId", c.integration_id as "integrationId",
            c.auth_method_id as "authMethodId", c.scope, c.name, c.status,
            c.sealed_payload as "sealedPayload", c.created_by as "createdBy",
            o.id as "sourceOrg", m.user_id as "memberId"
       from credential_connection c
       join organization o on o.id = c.organization_id
       join member m on m.organization_id = o.id
      where (o.name = $1 or o.slug = $1) and c.integration_id = $2 and c.status = 'active'
      order by c.is_default desc, c.created_at desc
      limit 1`,
    [from, integration]
  )
).rows[0];

if (source === undefined) {
  throw new Error(`No active ${integration} connection in "${from}"`);
}

const existing = (
  await db.query(
    "select id, name from organization where name = $1 or slug = $1",
    [to]
  )
).rows[0];

const now = new Date();
const organizationId = existing?.id ?? randomUUID();

if (existing === undefined) {
  await db.query(
    "insert into organization (id, name, slug, created_at) values ($1, $2, $3, $4)",
    [organizationId, to, to.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-"), now]
  );
  await db.query(
    "insert into member (id, organization_id, user_id, role, created_at) values ($1, $2, $3, $4, $5)",
    [randomUUID(), organizationId, source.memberId, "owner", now]
  );
  process.stderr.write(`Created ${to}.\n`);
}

const opened = await crypto.subtle.decrypt(
  {
    additionalData: encoder.encode(contextOf(source)),
    iv: bytes(source.sealedPayload.split(".")[1]),
    name: "AES-GCM",
  },
  key,
  bytes(source.sealedPayload.split(".")[2])
);

const id = `ccn_${randomUUID().replaceAll("-", "")}`;
const iv = crypto.getRandomValues(new Uint8Array(12));

const sealed = await crypto.subtle.encrypt(
  {
    additionalData: encoder.encode(
      contextOf({ id, integrationId: integration, organizationId })
    ),
    iv,
    name: "AES-GCM",
  },
  key,
  encoder.encode(decoder.decode(opened))
);

await db.query(
  `insert into credential_connection
     (id, organization_id, integration_id, auth_method_id, scope, name, status,
      sealed_payload, is_default, created_by, created_at, updated_at)
   values ($1, $2, $3, $4, $5, $6, 'active', $7, true, $8, $9, $9)`,
  [
    id,
    organizationId,
    integration,
    source.authMethodId,
    source.scope,
    source.name,
    `v1.${base64(iv.buffer as ArrayBuffer)}.${base64(sealed)}`,
    source.createdBy,
    now,
  ]
);

process.stderr.write(
  `Copied the ${integration} connection from ${from} into ${to}.\n`
);
process.stdout.write(`${organizationId}\n`);

await db.end();

import { parseArgs } from "node:util";
import { Client } from "pg";
import { MigrationRefused } from "../src/migrations/inspect";
import { migrate } from "../src/migrations/migrate";
import { databaseUrl, describeTarget, isLocal } from "../src/migrations/target";

const { values } = parseArgs({
  options: { yes: { default: false, type: "boolean" } },
});

const url = databaseUrl();
if (url === undefined) {
  console.error(
    "No DATABASE_URL. Set it, or put it in .env.local at the repository root."
  );
  process.exit(1);
}
if (!isLocal(url)) {
  console.error(
    `${describeTarget(url)} is not on this machine, and reset only drops local databases.`
  );
  process.exit(1);
}

const target = new URL(url);
const name = decodeURIComponent(target.pathname.slice(1));
const server = new URL(url);
server.pathname = "/postgres";

const admin = new Client({
  connectionString: server.toString(),
  connectionTimeoutMillis: 5000,
});
await admin.connect().catch((cause: Error) => {
  console.error(
    `Could not reach Postgres on ${target.host}: ${cause.message}. Is it running?`
  );
  process.exit(1);
});

const started = performance.now();
try {
  const exists = await admin.query(
    "select 1 from pg_database where datname = $1",
    [name]
  );
  if ((exists.rowCount ?? 0) > 0 && !values.yes) {
    console.error(
      `This deletes ${name} and everything in it. Run bun run db:reset --yes to go ahead.`
    );
    process.exit(1);
  }
  const quoted = `"${name.replaceAll('"', '""')}"`;
  await admin.query(`drop database if exists ${quoted} with (force)`);
  await admin.query(`create database ${quoted}`);
} finally {
  await admin.end();
}

console.log(`Created an empty ${describeTarget(url)}.`);
try {
  await migrate(url, { confirmDataLoss: false });
} catch (cause) {
  if (!(cause instanceof MigrationRefused)) {
    throw cause;
  }
  console.error(cause.message);
  process.exit(1);
}
console.log(`Reset in ${((performance.now() - started) / 1000).toFixed(1)}s.`);

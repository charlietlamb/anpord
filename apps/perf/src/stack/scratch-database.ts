import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { testDatabaseUrl } from "@anpord/db/test-database";
import { runOrThrow } from "@anpord/e2e/src/harness/process";
import { Client } from "pg";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const SCRATCH_PREFIX = "anpord_scratch_";
let created = 0;

export interface ScratchDatabase {
  readonly name: string;
  readonly url: string;
}

const DEFAULT_SERVER = "postgresql://localhost:5432/postgres";

const fromEnvFile = (path: string) => {
  if (!existsSync(path)) {
    return;
  }
  const line = readFileSync(path, "utf8")
    .split("\n")
    .find((candidate) => candidate.startsWith("DATABASE_URL="));
  return line?.slice("DATABASE_URL=".length).trim();
};

const serverUrl = (repositoryRoot: string) => {
  const url = new URL(
    process.env.PERF_DATABASE_URL ??
      fromEnvFile(join(repositoryRoot, ".env.local")) ??
      DEFAULT_SERVER
  );
  if (!LOCAL_HOSTS.has(url.hostname)) {
    throw new Error(
      `The perf harness only creates scratch databases on a local Postgres, not ${url.hostname}.`
    );
  }
  return url;
};

const withDatabase = (url: URL, name: string) => {
  const next = new URL(url);
  next.pathname = `/${name}`;
  return next.toString();
};

const admin = async <T>(url: URL, use: (client: Client) => Promise<T>) => {
  const client = new Client({
    connectionString: withDatabase(url, "postgres"),
  });
  await client.connect();
  try {
    return await use(client);
  } finally {
    await client.end();
  }
};

export const createScratchDatabase = async (
  repositoryRoot: string,
  label: string
): Promise<ScratchDatabase> => {
  const base = serverUrl(repositoryRoot);
  created += 1;
  const name = `${SCRATCH_PREFIX}perf_${label}_${process.pid}_${created}`;
  const url = withDatabase(base, name);
  testDatabaseUrl({ EVAL_TEST_DATABASE_URL: url });

  await admin(base, async (client) => {
    await client.query(`drop database if exists ${name} with (force)`);
    await client.query(`create database ${name}`);
  });

  await runOrThrow(
    "Could not migrate the scratch database",
    "bun",
    ["scripts/migrate.ts"],
    {
      cwd: join(repositoryRoot, "packages/db"),
      env: { ...process.env, DATABASE_URL: url },
    }
  );

  return { name, url };
};

export const dropScratchDatabase = (
  repositoryRoot: string,
  database: ScratchDatabase
) => {
  testDatabaseUrl({ EVAL_TEST_DATABASE_URL: database.url });
  return admin(serverUrl(repositoryRoot), (client) =>
    client.query(`drop database if exists ${database.name} with (force)`)
  );
};

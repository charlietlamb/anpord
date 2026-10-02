import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isLocalHost } from "@sphynx/db/local-hosts";
import { testDatabaseUrl } from "@sphynx/db/test-database";
import { runOrThrow } from "@sphynx/e2e/src/harness/process";
import { Client } from "pg";

const SCRATCH_PREFIX = "sphynx_scratch_";
const QUOTED = /^(["'])(.*)\1$/;
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
  return line?.slice("DATABASE_URL=".length);
};

export const scratchServerUrl = (raw: string) => {
  const url = new URL(raw.trim().replace(QUOTED, "$2"));
  if (!isLocalHost(url.hostname)) {
    throw new Error(
      `The perf harness only creates scratch databases on a local Postgres, not ${url.hostname}.`
    );
  }
  return url;
};

const serverUrl = (repositoryRoot: string) =>
  scratchServerUrl(
    process.env.PERF_DATABASE_URL ??
      fromEnvFile(join(repositoryRoot, ".env.local")) ??
      DEFAULT_SERVER
  );

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

const dropDatabase = (url: URL, name: string) =>
  admin(url, (client) =>
    client.query(`drop database if exists ${name} with (force)`)
  );

export const createScratchDatabase = async (
  repositoryRoot: string,
  label: string
): Promise<ScratchDatabase> => {
  const base = serverUrl(repositoryRoot);
  created += 1;
  const name = `${SCRATCH_PREFIX}perf_${label}_${process.pid}_${created}`;
  const url = withDatabase(base, name);
  testDatabaseUrl({ EVAL_TEST_DATABASE_URL: url });

  await dropDatabase(base, name);
  await admin(base, (client) => client.query(`create database ${name}`));

  try {
    await runOrThrow(
      "Could not migrate the scratch database",
      "bun",
      ["scripts/migrate.ts"],
      {
        cwd: join(repositoryRoot, "packages/db"),
        env: { ...process.env, DATABASE_URL: url },
      }
    );
  } catch (cause) {
    await dropDatabase(base, name);
    throw cause;
  }

  return { name, url };
};

export const dropScratchDatabase = (
  repositoryRoot: string,
  database: ScratchDatabase
) => {
  testDatabaseUrl({ EVAL_TEST_DATABASE_URL: database.url });
  return dropDatabase(serverUrl(repositoryRoot), database.name);
};

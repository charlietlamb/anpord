import { existsSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runOrThrow, runProcess } from "./process";

const PORT = 55_433;
const SUPERUSER = "postgres";
const DATABASE = "anpord_e2e";

/**
 * The default unix socket path is derived from the data directory, and a
 * scratch path alone can exceed the 103 byte limit Postgres allows. A short
 * directory keeps the socket inside the limit wherever the data lives.
 */
const SOCKET_DIRECTORY = join(tmpdir(), "anpord-e2e-pg");

export const DATABASE_URL = `postgresql://${SUPERUSER}@127.0.0.1:${PORT}/${DATABASE}`;

/**
 * Where the server binaries live, which is not the same on every machine and
 * is not on PATH at all on Debian: `initdb` and `pg_ctl` sit under
 * /usr/lib/postgresql/&lt;major&gt;/bin while only the client tools are linked.
 * PGBIN names it outright when a machine keeps them somewhere else again.
 */
const CANDIDATE_BINS = [
  process.env.PGBIN,
  "/opt/homebrew/opt/postgresql@17/bin",
  "/usr/lib/postgresql/17/bin",
  "/usr/lib/postgresql/16/bin",
  "/usr/local/opt/postgresql@17/bin",
].filter((path): path is string => path !== undefined);

let cachedBin: string | undefined;

const binDirectory = () => {
  cachedBin ??= CANDIDATE_BINS.find((path) => existsSync(join(path, "initdb")));

  if (cachedBin === undefined) {
    throw new Error(
      `Could not find the postgres server binaries. Looked in:\n  ${CANDIDATE_BINS.join("\n  ")}\nSet PGBIN to the directory holding initdb and pg_ctl.`
    );
  }

  return cachedBin;
};

const tool = (name: string) => join(binDirectory(), name);

const psqlArgs = (sql: string) => [
  "-h",
  "127.0.0.1",
  "-p",
  String(PORT),
  "-U",
  SUPERUSER,
  "-d",
  "postgres",
  "-v",
  "ON_ERROR_STOP=1",
  "-c",
  sql,
];

const isRunning = async () =>
  (await runProcess(tool("psql"), psqlArgs("select 1"))).code === 0;

/**
 * A cluster owned by the tests rather than the machine, so a developer's own
 * Postgres keeps its port, its data, and its version.
 */
export const startDatabase = async (dataDirectory: string) => {
  if (await isRunning()) {
    return;
  }

  rmSync(dataDirectory, { force: true, recursive: true });
  mkdirSync(SOCKET_DIRECTORY, { recursive: true });

  await runOrThrow("Could not create the test cluster", tool("initdb"), [
    "-D",
    dataDirectory,
    "-U",
    SUPERUSER,
    "--auth=trust",
  ]);

  await runOrThrow("Could not start the test cluster", tool("pg_ctl"), [
    "-D",
    dataDirectory,
    "-o",
    `-p ${PORT} -k ${SOCKET_DIRECTORY} -c listen_addresses=127.0.0.1`,
    "-l",
    join(dataDirectory, "postgres.log"),
    "-w",
    "start",
  ]);
};

export const stopDatabase = (dataDirectory: string) =>
  runProcess(tool("pg_ctl"), ["-D", dataDirectory, "-m", "immediate", "stop"]);

/** Dropped and recreated per run, so a scenario never inherits a row it did
 * not write and a failed run cannot poison the next one. */
export const resetDatabase = async () => {
  await runOrThrow(
    "Could not drop the test database",
    tool("psql"),
    psqlArgs(`drop database if exists ${DATABASE}`)
  );

  await runOrThrow(
    "Could not create the test database",
    tool("psql"),
    psqlArgs(`create database ${DATABASE}`)
  );
};

/**
 * The real migrations rather than a schema push, so a run also proves the
 * journal applies cleanly from nothing.
 */
export const migrateDatabase = (repositoryRoot: string) =>
  runOrThrow(
    "Could not migrate the test database",
    "bunx",
    ["drizzle-kit", "migrate", "--config", "drizzle.config.ts"],
    {
      cwd: join(repositoryRoot, "packages/db"),
      env: { ...process.env, DATABASE_URL },
    }
  );

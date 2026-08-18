import { spawn } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PORT = 55_433;
const SUPERUSER = "postgres";
const DATABASE = "anpord_e2e";

/**
 * The default unix socket path is derived from the data directory, and the
 * scratchpad path alone exceeds the 103 byte limit Postgres allows. A short
 * directory keeps the socket inside the limit wherever the data lives.
 */
const SOCKET_DIRECTORY = join(tmpdir(), "anpord-e2e-pg");

export const DATABASE_URL = `postgresql://${SUPERUSER}@127.0.0.1:${PORT}/${DATABASE}`;

const BIN = "/opt/homebrew/opt/postgresql@17/bin";

const run = (
  command: string,
  args: readonly string[],
  options: { readonly cwd?: string; readonly env?: NodeJS.ProcessEnv } = {}
) =>
  new Promise<{ code: number; output: string }>((resolve) => {
    const child = spawn(command, [...args], {
      cwd: options.cwd,
      env: { ...process.env, ...options.env, PGPORT: String(PORT) },
    });

    let output = "";
    child.stdout.on("data", (chunk) => {
      output += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      output += String(chunk);
    });

    child.on("close", (code) => resolve({ code: code ?? 1, output }));
  });

const psql = (sql: string, database = "postgres") =>
  run(join(BIN, "psql"), [
    "-h",
    "127.0.0.1",
    "-p",
    String(PORT),
    "-U",
    SUPERUSER,
    "-d",
    database,
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    sql,
  ]);

const isRunning = async () => (await psql("select 1")).code === 0;

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

  const created = await run(join(BIN, "initdb"), [
    "-D",
    dataDirectory,
    "-U",
    SUPERUSER,
    "--auth=trust",
  ]);

  if (created.code !== 0) {
    throw new Error(`Could not create the test cluster:\n${created.output}`);
  }

  const started = await run(join(BIN, "pg_ctl"), [
    "-D",
    dataDirectory,
    "-o",
    `-p ${PORT} -k ${SOCKET_DIRECTORY} -c listen_addresses=127.0.0.1`,
    "-l",
    join(dataDirectory, "postgres.log"),
    "-w",
    "start",
  ]);

  if (started.code !== 0) {
    throw new Error(`Could not start the test cluster:\n${started.output}`);
  }
};

export const stopDatabase = (dataDirectory: string) =>
  run(join(BIN, "pg_ctl"), ["-D", dataDirectory, "-m", "immediate", "stop"]);

/** Dropped and recreated per run, so a scenario never inherits a row it did
 * not write and a failed run cannot poison the next one. */
export const resetDatabase = async () => {
  const dropped = await psql(`drop database if exists ${DATABASE}`);
  if (dropped.code !== 0) {
    throw new Error(`Could not drop the test database:\n${dropped.output}`);
  }

  const created = await psql(`create database ${DATABASE}`);
  if (created.code !== 0) {
    throw new Error(`Could not create the test database:\n${created.output}`);
  }
};

/**
 * The real migrations rather than a schema push, so a run also proves the
 * journal applies cleanly from nothing.
 */
export const migrateDatabase = async (repositoryRoot: string) => {
  const migrated = await run(
    "bunx",
    ["drizzle-kit", "migrate", "--config", "drizzle.config.ts"],
    {
      cwd: join(repositoryRoot, "packages/db"),
      env: { DATABASE_URL },
    }
  );

  if (migrated.code !== 0) {
    throw new Error(`Could not migrate the test database:\n${migrated.output}`);
  }
};

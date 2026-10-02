import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { freePort, portIsFree } from "./ports";
import { runOrThrow, runProcess } from "./process";

const SUPERUSER = "postgres";
const DATABASE = "sphynx_e2e";

/* Postgres caps a unix socket path at 103 bytes, which a scratch data directory alone can exceed. */
const SOCKET_DIRECTORY = join(tmpdir(), "sphynx-e2e-pg");

/* initdb and pg_ctl are not on PATH on Debian; PGBIN names their directory when a machine keeps them elsewhere. */
const CANDIDATE_BINS = [
  process.env.PGBIN,
  "/opt/homebrew/opt/postgresql@17/bin",
  "/usr/lib/postgresql/17/bin",
  "/usr/lib/postgresql/16/bin",
  "/usr/local/opt/postgresql@17/bin",
].filter((path): path is string => path !== undefined);

let cachedBin: string | undefined;

export const findPostgresBin = () => {
  cachedBin ??= CANDIDATE_BINS.find((path) => existsSync(join(path, "initdb")));
  return cachedBin;
};

const binDirectory = () => {
  const found = findPostgresBin();

  if (found === undefined) {
    throw new Error(
      `Could not find the postgres server binaries. Looked in:\n  ${CANDIDATE_BINS.join("\n  ")}\nSet PGBIN to the directory holding initdb and pg_ctl.`
    );
  }

  return found;
};

const tool = (name: string) => join(binDirectory(), name);

export interface Cluster {
  readonly dataDirectory: string;
  readonly port: number;
  readonly url: string;
}

const clusterOn = (dataDirectory: string, port: number): Cluster => ({
  dataDirectory,
  port,
  url: `postgresql://${SUPERUSER}@127.0.0.1:${port}/${DATABASE}`,
});

const psqlArgs = (port: number, sql: string, database = "postgres") => [
  "-h",
  "127.0.0.1",
  "-p",
  String(port),
  "-U",
  SUPERUSER,
  "-d",
  database,
  "-v",
  "ON_ERROR_STOP=1",
  "-tAc",
  sql,
];

export const psql = (port: number, sql: string, database?: string) =>
  runProcess(tool("psql"), psqlArgs(port, sql, database));

type PortHolder =
  | { readonly kind: "nobody" }
  | { readonly kind: "this checkout" }
  | { readonly kind: "someone else"; readonly detail: string };

const sameDirectory = (left: string, right: string) =>
  existsSync(left) &&
  existsSync(right) &&
  realpathSync(left) === realpathSync(right);

const holderOf = async (
  port: number,
  dataDirectory: string
): Promise<PortHolder> => {
  if (await portIsFree(port)) {
    return { kind: "nobody" };
  }

  const answer = await psql(port, "show data_directory");

  if (answer.code !== 0) {
    return {
      detail: `it does not answer as a Postgres this harness can sign in to: ${answer.stderr.trim().split("\n")[0] ?? "no reply"}`,
      kind: "someone else",
    };
  }

  const reported = answer.stdout.trim();

  return sameDirectory(reported, dataDirectory)
    ? { kind: "this checkout" }
    : { detail: `its data directory is ${reported}`, kind: "someone else" };
};

const recordPath = (stateDirectory: string) =>
  join(stateDirectory, "postgres.json");

const readRecordedPort = (stateDirectory: string) => {
  const path = recordPath(stateDirectory);

  if (!existsSync(path)) {
    return;
  }

  const { port } = JSON.parse(readFileSync(path, "utf8")) as {
    readonly port: number;
  };
  return port;
};

const runningPort = (dataDirectory: string) => {
  const pidFile = join(dataDirectory, "postmaster.pid");

  if (!existsSync(pidFile)) {
    return;
  }

  const port = Number(readFileSync(pidFile, "utf8").split("\n")[3]);
  return Number.isInteger(port) && port > 0 ? port : undefined;
};

const initialise = async (dataDirectory: string) => {
  if (existsSync(join(dataDirectory, "PG_VERSION"))) {
    return;
  }

  await runOrThrow("Could not create the test cluster", tool("initdb"), [
    "-D",
    dataDirectory,
    "-U",
    SUPERUSER,
    "--auth=trust",
  ]);
};

const start = (dataDirectory: string, port: number) =>
  runOrThrow("Could not start the test cluster", tool("pg_ctl"), [
    "-D",
    dataDirectory,
    "-o",
    `-p ${port} -k ${SOCKET_DIRECTORY} -c listen_addresses=127.0.0.1`,
    "-l",
    join(dataDirectory, "postgres.log"),
    "-w",
    "start",
  ]);

const refuse = (port: number, detail: string, stateDirectory: string) =>
  new Error(
    `Port ${port} holds a server this checkout did not start, so the e2e harness will not touch it (${detail}). Stop that server, or delete ${recordPath(stateDirectory)} so the next run picks a free port.`
  );

export const ownCluster = async (stateDirectory: string): Promise<Cluster> => {
  const dataDirectory = join(stateDirectory, "postgres");
  mkdirSync(stateDirectory, { recursive: true });
  mkdirSync(SOCKET_DIRECTORY, { recursive: true });

  const port =
    runningPort(dataDirectory) ??
    readRecordedPort(stateDirectory) ??
    (await freePort());
  const holder = await holderOf(port, dataDirectory);

  if (holder.kind === "someone else") {
    throw refuse(port, holder.detail, stateDirectory);
  }

  if (holder.kind === "nobody") {
    await initialise(dataDirectory);
    await start(dataDirectory, port);
  }

  writeFileSync(recordPath(stateDirectory), `${JSON.stringify({ port })}\n`);

  return clusterOn(realpathSync(dataDirectory), port);
};

export const stopCluster = (cluster: Cluster) =>
  runProcess(tool("pg_ctl"), [
    "-D",
    cluster.dataDirectory,
    "-m",
    "immediate",
    "stop",
  ]);

export const resetDatabase = async (cluster: Cluster) => {
  await runOrThrow(
    "Could not drop the test database",
    tool("psql"),
    psqlArgs(cluster.port, `drop database if exists ${DATABASE}`)
  );

  await runOrThrow(
    "Could not create the test database",
    tool("psql"),
    psqlArgs(cluster.port, `create database ${DATABASE}`)
  );
};

/* Real migrations rather than a schema push, so a run proves the journal applies cleanly from nothing. */
export const migrateDatabase = (repositoryRoot: string, cluster: Cluster) =>
  runOrThrow(
    "Could not migrate the test database",
    "bun",
    ["scripts/migrate.ts"],
    {
      cwd: join(repositoryRoot, "packages/db"),
      env: { ...process.env, DATABASE_URL: cluster.url },
    }
  );

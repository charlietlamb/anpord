import { mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";
import { ApiKeyStore } from "./harness/api-keys";
import {
  DATABASE_URL,
  migrateDatabase,
  resetDatabase,
  startDatabase,
  stopDatabase,
} from "./harness/database";
import { type Outcome, runScenarios } from "./harness/run";
import { seedTenant } from "./harness/seed";
import { startServer } from "./harness/server";
import { AUTH_SECRET, SERVER_PORT } from "./harness/settings";
import { apiScenarios } from "./scenarios/api";
import { cliScenarios } from "./scenarios/cli";
import { sdkScenarios } from "./scenarios/sdk";
import type { World } from "./world";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = resolve(HERE, "../../..");
const STATE = resolve(HERE, "../.e2e");

const summarise = (outcomes: readonly Outcome[]) => {
  const failed = outcomes.filter((outcome) => !outcome.passed);

  process.stdout.write(
    `\n${outcomes.length - failed.length}/${outcomes.length} scenarios passed\n`
  );

  for (const outcome of failed) {
    process.stdout.write(`  failed: ${outcome.name}\n`);
  }

  return failed.length === 0;
};

/** Set before any layer reads Config, so the harness talks to the test
 * cluster rather than whatever .env points at. */
const applyTestEnvironment = () => {
  process.env.DATABASE_URL = DATABASE_URL;
  process.env.BETTER_AUTH_SECRET = AUTH_SECRET;
  process.env.BETTER_AUTH_URL = `http://127.0.0.1:${SERVER_PORT}`;
  delete process.env.REDIS_URL;
};

const main = async () => {
  applyTestEnvironment();

  const dataDirectory = resolve(STATE, "postgres");
  const workspace = resolve(STATE, "workspace");

  mkdirSync(STATE, { recursive: true });
  rmSync(workspace, { force: true, recursive: true });
  mkdirSync(workspace, { recursive: true });

  process.stdout.write("starting postgres\n");
  await startDatabase(dataDirectory);
  await resetDatabase();

  process.stdout.write("applying migrations\n");
  await migrateDatabase(REPOSITORY_ROOT);

  process.stdout.write("seeding tenants\n");
  const tenant = await seedTenant(DATABASE_URL, "acme");
  const other = await seedTenant(DATABASE_URL, "globex");

  process.stdout.write("starting the server\n");
  const server = await startServer(REPOSITORY_ROOT, DATABASE_URL, SERVER_PORT);

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    const keys = new ApiKeyStore({
      authSecret: AUTH_SECRET,
      baseUrl: server.baseUrl,
      path: resolve(STATE, "api-keys.json"),
    });
    const writeKey = await keys.resolve("e2e-writer", tenant);
    const otherKey = await keys.resolve("e2e-other", other);

    const world: World = {
      baseUrl: server.baseUrl,
      databaseUrl: DATABASE_URL,
      directory: workspace,
      other,
      otherKey,
      query: async <Row>(sql: string, values: readonly unknown[] = []) => {
        const result = await client.query(sql, [...values]);
        return result.rows as readonly Row[];
      },
      repositoryRoot: REPOSITORY_ROOT,
      tenant,
      writeKey,
    };

    process.stdout.write("\napi\n");
    const api = await runScenarios(apiScenarios, world);

    process.stdout.write("\nsdk\n");
    const sdk = await runScenarios(sdkScenarios, world);

    process.stdout.write("\ncli\n");
    const cliOutcomes = await runScenarios(cliScenarios, world);

    const passed = summarise([...api, ...sdk, ...cliOutcomes]);
    process.exitCode = passed ? 0 : 1;
  } finally {
    await client.end();
    server.stop();

    /** Left running by default: the preserved key points at this cluster, so
     * a developer can keep poking at what the scenarios just built. */
    if (process.argv.includes("--stop")) {
      await stopDatabase(dataDirectory);
      process.stdout.write("stopped postgres\n");
    }
  }
};

await main();

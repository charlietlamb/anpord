import { mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Effect } from "effect";
import { ApiKeyStore } from "./harness/api-keys";
import {
  DATABASE_URL,
  migrateDatabase,
  resetDatabase,
} from "./harness/database";
import { summarise } from "./harness/report";
import { connection, database, server } from "./harness/resources";
import { type Outcome, runScenarios } from "./harness/run";
import { seedTenant } from "./harness/seed";
import { AUTH_SECRET, SERVER_PORT } from "./harness/settings";
import { apiScenarios } from "./scenarios/api";
import { cliScenarios } from "./scenarios/cli";
import { deploymentScenarios } from "./scenarios/deployments";
import { lifecycleScenarios } from "./scenarios/lifecycle";
import { resolutionScenarios } from "./scenarios/resolution";
import { sdkScenarios } from "./scenarios/sdk";
import { validationScenarios } from "./scenarios/validation";
import type { World } from "./world";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = resolve(HERE, "../../..");
const STATE = resolve(HERE, "../.e2e");

const say = (message: string) =>
  Effect.sync(() => process.stdout.write(`${message}\n`));

/** Set before anything reads Config, so the harness talks to the test cluster
 * rather than whatever .env points at. */
const applyTestEnvironment = () => {
  process.env.DATABASE_URL = DATABASE_URL;
  process.env.BETTER_AUTH_SECRET = AUTH_SECRET;
  process.env.BETTER_AUTH_URL = `http://127.0.0.1:${SERVER_PORT}`;
  delete process.env.REDIS_URL;
};

/** A fresh directory per run, so a scenario cannot pass by reading a file an
 * earlier run wrote. */
const prepareWorkspace = () => {
  const workspace = resolve(STATE, "workspace");
  mkdirSync(STATE, { recursive: true });
  rmSync(workspace, { force: true, recursive: true });
  mkdirSync(workspace, { recursive: true });
  return workspace;
};

const SURFACES = [
  { name: "api", scenarios: apiScenarios },
  { name: "resolution", scenarios: resolutionScenarios },
  { name: "lifecycle", scenarios: lifecycleScenarios },
  { name: "validation", scenarios: validationScenarios },
  { name: "deployments", scenarios: deploymentScenarios },
  { name: "sdk", scenarios: sdkScenarios },
  { name: "cli", scenarios: cliScenarios },
] as const;

/**
 * Every resource is acquired inside the scope, so a failure part way through
 * still gives back the cluster, the server and the connection. The cluster is
 * kept running by default because the preserved key points at it.
 */
const run = Effect.gen(function* () {
  applyTestEnvironment();

  const workspace = prepareWorkspace();
  const keepDatabase = !process.argv.includes("--stop");

  yield* say("starting postgres");
  yield* database(resolve(STATE, "postgres"), keepDatabase);
  yield* Effect.promise(() => resetDatabase());

  yield* say("applying migrations");
  yield* Effect.promise(() => migrateDatabase(REPOSITORY_ROOT));

  yield* say("seeding tenants");
  const tenant = yield* Effect.promise(() => seedTenant(DATABASE_URL, "acme"));
  const other = yield* Effect.promise(() => seedTenant(DATABASE_URL, "globex"));

  yield* say("starting the server");
  const running = yield* server(REPOSITORY_ROOT, DATABASE_URL, SERVER_PORT);
  const client = yield* connection(DATABASE_URL);

  const keys = new ApiKeyStore({
    authSecret: AUTH_SECRET,
    baseUrl: running.baseUrl,
    path: resolve(STATE, "api-keys.json"),
  });

  const world: World = {
    baseUrl: running.baseUrl,
    directory: workspace,
    otherKey: yield* Effect.promise(() => keys.resolve("e2e-other", other)),
    otherSessionToken: other.sessionToken,
    query: async <Row>(sql: string, values: readonly unknown[] = []) => {
      const result = await client.query(sql, [...values]);
      return result.rows as readonly Row[];
    },
    repositoryRoot: REPOSITORY_ROOT,
    sessionToken: tenant.sessionToken,
    writeKey: yield* Effect.promise(() => keys.resolve("e2e-writer", tenant)),
  };

  const outcomes: Outcome[] = [];
  for (const surface of SURFACES) {
    yield* say(`\n${surface.name}`);
    outcomes.push(
      ...(yield* Effect.promise(() => runScenarios(surface.scenarios, world)))
    );
  }

  return summarise(outcomes);
});

const passed = await Effect.runPromise(Effect.scoped(run));
process.exitCode = passed ? 0 : 1;

import { mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PROMPTS_ENABLED } from "@anpord/schema/domain/features";
import { Effect } from "effect";
import { ApiKeyStore } from "./harness/api-keys";
import { migrateDatabase, resetDatabase } from "./harness/database";
import { freePort } from "./harness/ports";
import { summarise } from "./harness/report";
import { connection, database, server } from "./harness/resources";
import { type Outcome, runScenarios } from "./harness/run";
import { seedTenant } from "./harness/seed";
import { AUTH_SECRET } from "./harness/settings";
import { activityScenarios } from "./scenarios/activity";
import { apiScenarios } from "./scenarios/api";
import { cliScenarios } from "./scenarios/cli";
import { evalScenarios } from "./scenarios/evals";
import { lifecycleScenarios } from "./scenarios/lifecycle";
import { resolutionScenarios } from "./scenarios/resolution";
import { sdkScenarios } from "./scenarios/sdk";
import { validationScenarios } from "./scenarios/validation";
import { whoamiScenarios } from "./scenarios/whoami";
import type { World } from "./world";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = resolve(HERE, "../../..");
const STATE = resolve(HERE, "../.e2e");

const say = (message: string) =>
  Effect.sync(() => process.stdout.write(`${message}\n`));

/* Must run before anything reads Config, or the harness talks to whatever .env points at. */
const applyTestEnvironment = (databaseUrl: string, serverPort: number) => {
  process.env.DATABASE_URL = databaseUrl;
  process.env.BETTER_AUTH_SECRET = AUTH_SECRET;
  process.env.BETTER_AUTH_URL = `http://127.0.0.1:${serverPort}`;
  delete process.env.REDIS_URL;
};

/* Fresh per run, so a scenario cannot pass by reading a file an earlier run wrote. */
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
  { name: "activity", scenarios: activityScenarios },
  { name: "sdk", scenarios: sdkScenarios },
  { name: "cli", scenarios: PROMPTS_ENABLED ? cliScenarios : [] },
  { name: "evals", scenarios: evalScenarios },
  { name: "whoami", scenarios: whoamiScenarios },
] as const;

/* The cluster is left running by default because the preserved key points at it. */
const run = Effect.gen(function* () {
  const workspace = prepareWorkspace();
  const keepDatabase = !process.argv.includes("--stop");

  yield* say("starting postgres");
  const cluster = yield* database(STATE, keepDatabase);
  const serverPort = yield* Effect.promise(() => freePort());
  applyTestEnvironment(cluster.url, serverPort);
  yield* Effect.promise(() => resetDatabase(cluster));

  yield* say("applying migrations");
  yield* Effect.promise(() => migrateDatabase(REPOSITORY_ROOT, cluster));

  yield* say("seeding tenants");
  const tenant = yield* Effect.promise(() => seedTenant(cluster.url, "acme"));
  const other = yield* Effect.promise(() => seedTenant(cluster.url, "globex"));

  yield* say("starting the server");
  const running = yield* server(REPOSITORY_ROOT, cluster.url, serverPort);
  const client = yield* connection(cluster.url);

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

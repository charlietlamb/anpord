import { join } from "node:path";
import type { StartBatchRequest } from "@anpord/schema/domain/eval-definition";
import { compileEval } from "anpord/eval";
import type { SeedPlan } from "../seed/plan";
import { type SeededWorld, seedWorld } from "../seed/seed";
import {
  createScratchDatabase,
  dropScratchDatabase,
  type ScratchDatabase,
} from "./scratch-database";
import { type RunningServer, startServer } from "./server";
import { givenTenant, type PerfTenant } from "./tenant";

export interface Stack {
  readonly database: ScratchDatabase;
  readonly seedMs: number;
  readonly server: RunningServer;
  readonly teardown: () => Promise<void>;
  readonly template: StartBatchRequest;
  readonly tenant: PerfTenant;
  readonly world: SeededWorld | null;
}

export interface StackOptions {
  readonly label: string;
  readonly plan: SeedPlan | null;
  readonly repositoryRoot: string;
  readonly trustedOrigins?: readonly string[];
}

const smokeTemplate = (repositoryRoot: string) =>
  compileEval(
    join(repositoryRoot, "scripts/fixtures/local-smoke/smoke.eval.ts")
  );

export const bootStack = async (options: StackOptions): Promise<Stack> => {
  const database = await createScratchDatabase(
    options.repositoryRoot,
    options.label
  );
  let server: RunningServer | undefined;
  const teardown = async () => {
    await server?.stop();
    await dropScratchDatabase(options.repositoryRoot, database);
  };

  try {
    server = await startServer({
      databaseUrl: database.url,
      repositoryRoot: options.repositoryRoot,
      trustedOrigins: options.trustedOrigins,
    });
    const tenant = await givenTenant(database.url, server.baseUrl, "perf");
    await givenTenant(database.url, server.baseUrl, "perf-other");
    const template = await smokeTemplate(options.repositoryRoot);

    const seedStarted = performance.now();
    const world =
      options.plan === null
        ? null
        : await seedWorld(server.baseUrl, tenant, options.plan, template);

    return {
      database,
      seedMs: performance.now() - seedStarted,
      server,
      teardown,
      template,
      tenant,
      world,
    };
  } catch (cause) {
    await teardown();
    throw cause;
  }
};

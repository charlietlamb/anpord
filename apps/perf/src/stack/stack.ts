import { join } from "node:path";
import type { StartBatchRequest } from "@anpord/schema/domain/eval-definition";
import { compileEval } from "anpord/eval";
import type { SeedPlan } from "../seed/plan";
import { type SeededWorld, seedWorld } from "../seed/seed";
import { type CallV1, v1Client } from "./api";
import { createScratchDatabase, dropScratchDatabase } from "./scratch-database";
import { type RunningServer, startServer } from "./server";
import { givenTenant, type PerfTenant } from "./tenant";

export interface Stack {
  readonly call: CallV1;
  readonly coldStart: () => Promise<number>;
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
  readonly trustedOrigins?: readonly string[];
}

export const bootStack = async (
  root: string,
  options: StackOptions
): Promise<Stack> => {
  const database = await createScratchDatabase(root, options.label);
  let server: RunningServer | undefined;
  const teardown = async () => {
    await server?.stop();
    await dropScratchDatabase(root, database);
  };

  try {
    server = await startServer(root, database.url, options.trustedOrigins);
    const tenant = await givenTenant(database.url, server.baseUrl, "perf");
    await givenTenant(database.url, server.baseUrl, "perf-other");
    const template = await compileEval(
      join(root, "scripts/fixtures/local-smoke/smoke.eval.ts")
    );
    const call = v1Client(server.baseUrl, tenant.apiKey);

    const seedStarted = performance.now();
    const world =
      options.plan === null
        ? null
        : await seedWorld(call, options.plan, template);

    return {
      call,
      coldStart: async () => {
        const fresh = await startServer(root, database.url);
        await fresh.stop();
        return fresh.coldStartMs;
      },
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

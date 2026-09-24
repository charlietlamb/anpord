import { beforeAll, describe, expect, it } from "bun:test";
import { Database } from "@anpord/db/client";
import { evalTrial } from "@anpord/db/schema/evals/eval-trials";
import { inArray } from "drizzle-orm";
import { Duration, Effect, Layer, Redacted } from "effect";
import { layerTestResolver } from "../../src/credentials/layer-test-resolver";
import type { DestroySandbox } from "../../src/ports/sandbox";
import { SandboxProvider } from "../../src/ports/sandbox";
import { LiveSandboxesLive } from "../../src/repositories/live-sandboxes";
import { reapSandboxes } from "../../src/services/sandbox-reaper";
import { skipWithoutDatabase, testDatabase } from "../fixtures/database";
import {
  seedConnection,
  seedOrganization,
  seedRun,
  seedTrial,
} from "../fixtures/eval-rows";

const destroyed: DestroySandbox[] = [];

const recordingSandboxes = Layer.succeed(
  SandboxProvider,
  SandboxProvider.of({
    attach: () => Effect.die("a reaper never attaches"),
    destroy: (input) =>
      Effect.sync(() => {
        destroyed.push(input);
      }),
    open: () => Effect.die("a reaper never opens"),
  })
);

const TestLayer = Layer.mergeAll(
  LiveSandboxesLive,
  recordingSandboxes,
  layerTestResolver({ apiKey: "sandbox-key" })
).pipe(Layer.provideMerge(testDatabase()));

const suffix = Date.now();
const organizationId = `org_reap_${suffix}`;
const connectionId = `conn_reap_${suffix}`;
const HOURS = 3_600_000;

const reap = () =>
  Effect.runPromise(
    reapSandboxes(Duration.minutes(90)).pipe(Effect.provide(TestLayer))
  );

const withDb = <A>(use: (db: Database["Type"]) => Promise<A>) =>
  Effect.runPromise(
    Database.pipe(
      Effect.flatMap((db) => Effect.promise(() => use(db))),
      Effect.provide(TestLayer)
    )
  );

const trialIds = {
  fresh: `etri_reap_fresh_${suffix}`,
  keyed: `etri_reap_keyed_${suffix}`,
  released: `etri_reap_released_${suffix}`,
  stale: `etri_reap_stale_${suffix}`,
  voided: `etri_reap_voided_${suffix}`,
};

describe.skipIf(skipWithoutDatabase())("reapSandboxes", () => {
  beforeAll(async () => {
    await withDb(async (db) => {
      await seedOrganization(db, organizationId);
      await seedConnection(db, {
        id: connectionId,
        integrationId: "e2b",
        organizationId,
      });
      const old = await seedRun(db, {
        createdAt: new Date(Date.now() - 12 * HOURS),
        organizationId,
        tag: `reap_${suffix}`,
        trialCount: 4,
      });
      const keyed = await seedRun(db, {
        createdAt: new Date(Date.now() - 12 * HOURS),
        organizationId,
        sandbox: "e2b",
        sandboxConnectionId: connectionId,
        tag: `reap_keyed_${suffix}`,
      });
      const twoHoursAgo = new Date(Date.now() - 2 * HOURS);

      await seedTrial(db, {
        internalId: trialIds.stale,
        ordinal: 1,
        runInternalId: old.runInternalId,
        sandboxId: "sbx-stale",
        startedAt: twoHoursAgo,
        status: "running",
      });
      await seedTrial(db, {
        internalId: trialIds.fresh,
        ordinal: 2,
        runInternalId: old.runInternalId,
        sandboxId: "sbx-fresh",
        startedAt: new Date(),
        status: "running",
      });
      await seedTrial(db, {
        internalId: trialIds.released,
        ordinal: 3,
        runInternalId: old.runInternalId,
        sandboxId: null,
        startedAt: twoHoursAgo,
        status: "passed",
      });
      await seedTrial(db, {
        internalId: trialIds.voided,
        ordinal: 4,
        runInternalId: old.runInternalId,
        sandboxId: "sbx-voided",
        startedAt: twoHoursAgo,
        status: "void",
      });
      await seedTrial(db, {
        internalId: trialIds.keyed,
        ordinal: 1,
        runInternalId: keyed.runInternalId,
        sandboxId: "sbx-keyed",
        startedAt: twoHoursAgo,
        status: "running",
      });
    });
  });

  it("destroys the sandbox of a trial started long ago and clears its id", async () => {
    const reaped = await reap();
    const after = await withDb((db) =>
      db
        .select({
          internalId: evalTrial.internalId,
          sandboxId: evalTrial.sandboxId,
        })
        .from(evalTrial)
        .where(inArray(evalTrial.internalId, Object.values(trialIds)))
    );
    const byId = new Map(after.map((row) => [row.internalId, row.sandboxId]));
    const ids = destroyed.map((input) => input.id);

    expect(ids).toContain("sbx-stale");
    expect(ids).toContain("sbx-voided");
    expect(ids).toContain("sbx-keyed");
    expect(ids).not.toContain("sbx-fresh");
    expect(reaped.destroyed).toBeGreaterThanOrEqual(3);

    expect(byId.get(trialIds.stale)).toBeNull();
    expect(byId.get(trialIds.voided)).toBeNull();
    expect(byId.get(trialIds.keyed)).toBeNull();
    expect(byId.get(trialIds.fresh)).toBe("sbx-fresh");
  });

  it("destroys through the provider and credential the run was bound to", () => {
    const stale = destroyed.find((input) => input.id === "sbx-stale");
    const keyed = destroyed.find((input) => input.id === "sbx-keyed");

    expect(stale?.provider).toBe("daytona");
    expect(stale?.credentials).toBeUndefined();
    expect(keyed?.provider).toBe("e2b");
    expect(
      keyed?.credentials === undefined
        ? undefined
        : Redacted.value(keyed.credentials)
    ).toEqual({ apiKey: "sandbox-key" });
  });

  it("finds nothing the second time", async () => {
    const before = destroyed.length;
    const reaped = await reap();

    expect(reaped.destroyed).toBe(0);
    expect(destroyed.length).toBe(before);
  });
});

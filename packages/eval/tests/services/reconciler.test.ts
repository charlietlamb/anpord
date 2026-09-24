import { beforeAll, describe, expect, it } from "bun:test";
import { Database } from "@anpord/db/client";
import { evalBatch } from "@anpord/db/schema/evals/eval-batches";
import { evalRun } from "@anpord/db/schema/evals/eval-runs";
import { evalTrial } from "@anpord/db/schema/evals/eval-trials";
import { validationExecution } from "@anpord/schema/domain/eval-validations";
import { eq } from "drizzle-orm";
import { Duration, Effect, Layer } from "effect";
import {
  type AbandonedWork,
  AbandonedWorkLive,
} from "../../src/repositories/abandoned-work";
import { reconcile } from "../../src/services/reconciler";
import { skipWithoutDatabase, testDatabase } from "../fixtures/database";
import {
  type SeededRun,
  seedOrganization,
  seedRun,
  seedTrial,
} from "../fixtures/eval-rows";

const TestLayer = AbandonedWorkLive.pipe(Layer.provideMerge(testDatabase()));

const suffix = Date.now();
const organizationId = `org_reconcile_${suffix}`;
const HOURS = 3_600_000;

const run = <A, E>(effect: Effect.Effect<A, E, AbandonedWork | Database>) =>
  Effect.runPromise(effect.pipe(Effect.provide(TestLayer)));

const withDb = <A>(use: (db: Database["Type"]) => Promise<A>) =>
  run(Database.pipe(Effect.flatMap((db) => Effect.promise(() => use(db)))));

const read = (seeded: SeededRun) =>
  withDb(async (db) => ({
    batch: (
      await db
        .select()
        .from(evalBatch)
        .where(eq(evalBatch.internalId, seeded.batchInternalId))
    )[0],
    run: (
      await db
        .select()
        .from(evalRun)
        .where(eq(evalRun.internalId, seeded.runInternalId))
    )[0],
    trials: await db
      .select()
      .from(evalTrial)
      .where(eq(evalTrial.runInternalId, seeded.runInternalId)),
  }));

describe.skipIf(skipWithoutDatabase())("reconcile", () => {
  const seeded: Record<string, SeededRun> = {};

  beforeAll(async () => {
    await withDb(async (db) => {
      await seedOrganization(db, organizationId);
      seeded.stale = await seedRun(db, {
        createdAt: new Date(Date.now() - 12 * HOURS),
        organizationId,
        tag: `rec_stale_${suffix}`,
        trialCount: 2,
      });
      seeded.fresh = await seedRun(db, {
        organizationId,
        tag: `rec_fresh_${suffix}`,
      });
      seeded.done = await seedRun(db, {
        batchStatus: "finished",
        createdAt: new Date(Date.now() - 12 * HOURS),
        organizationId,
        runStatus: "finished",
        tag: `rec_done_${suffix}`,
      });

      const stale = seeded.stale;
      if (stale === undefined) {
        return;
      }
      const startedAt = new Date(Date.now() - 7 * HOURS);
      await seedTrial(db, {
        internalId: `etri_rec_running_${suffix}`,
        ordinal: 1,
        runInternalId: stale.runInternalId,
        startedAt,
        status: "running",
        validations: [
          validationExecution(
            { id: "code:0", index: 0, kind: "code", name: "interrupted" },
            startedAt.getTime()
          ),
          {
            ...validationExecution(
              { id: "judge:0", index: 0, kind: "judge", name: "not started" },
              null
            ),
            status: "queued",
          },
        ],
      });
      await seedTrial(db, {
        finishedAt: startedAt,
        internalId: `etri_rec_passed_${suffix}`,
        ordinal: 2,
        runInternalId: stale.runInternalId,
        startedAt,
        status: "passed",
      });
      const fresh = seeded.fresh;
      if (fresh !== undefined) {
        await seedTrial(db, {
          internalId: `etri_rec_fresh_${suffix}`,
          ordinal: 1,
          runInternalId: fresh.runInternalId,
          startedAt: new Date(),
          status: "running",
        });
      }
    });
  });

  it("voids stale trials, fails stale runs and batches, and spares live work", async () => {
    const swept = await run(reconcile(Duration.hours(6)));

    expect(swept.trials).toBeGreaterThanOrEqual(1);
    expect(swept.runs).toBeGreaterThanOrEqual(1);
    expect(swept.batches).toBeGreaterThanOrEqual(1);

    const stale = await read(seeded.stale as SeededRun);
    const running = stale.trials.find((trial) => trial.ordinal === 1);
    const passed = stale.trials.find((trial) => trial.ordinal === 2);

    expect(running?.status).toBe("void");
    expect(running?.failure).toContain("abandoned");
    expect(running?.finishedAt).not.toBeNull();
    expect(running?.validations?.map((record) => record.status)).toEqual([
      "error",
      "skipped",
    ]);
    expect(passed?.status).toBe("passed");
    expect(stale.run?.status).toBe("failed");
    expect(stale.run?.finishedAt).not.toBeNull();
    expect(stale.batch?.status).toBe("failed");
    expect(stale.batch?.failure).toContain("abandoned");

    const fresh = await read(seeded.fresh as SeededRun);
    expect(fresh.trials[0]?.status).toBe("running");
    expect(fresh.run?.status).toBe("running");
    expect(fresh.batch?.status).toBe("running");

    const done = await read(seeded.done as SeededRun);
    expect(done.run?.status).toBe("finished");
    expect(done.batch?.status).toBe("finished");
    expect(done.batch?.failure).toBeNull();
  });

  it("leaves work it already closed as it was", async () => {
    const before = await read(seeded.stale as SeededRun);
    await run(reconcile(Duration.hours(6)));
    const after = await read(seeded.stale as SeededRun);

    expect(after.run?.finishedAt).toEqual(before.run?.finishedAt ?? null);
    expect(after.batch?.finishedAt).toEqual(before.batch?.finishedAt ?? null);
    expect(after.trials).toEqual(before.trials);
  });
});

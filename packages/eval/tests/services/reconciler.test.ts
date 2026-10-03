import { beforeAll, describe, expect, it } from "bun:test";
import { Database } from "@sphynx/db/client";
import { evalBatch } from "@sphynx/db/schema/evals/eval-batches";
import { evalRun } from "@sphynx/db/schema/evals/eval-runs";
import { evalTrial } from "@sphynx/db/schema/evals/eval-trials";
import { skipWithoutDatabase, testDatabase } from "@sphynx/db/test-database";
import { IdGeneratorLive } from "@sphynx/ids/layer";
import { validationExecution } from "@sphynx/schema/domain/eval-validations";
import { asc, eq } from "drizzle-orm";
import { Duration, Effect, Layer, TestClock, TestContext } from "effect";
import {
  type AbandonedWork,
  AbandonedWorkLive,
} from "../../src/repositories/abandoned-work";
import {
  BatchRepository,
  BatchRepositoryLive,
  type InsertedBatch,
} from "../../src/repositories/batch-repository";
import { reconcile } from "../../src/services/reconciler";
import {
  type SeededRun,
  seedOrganization,
  seedRun,
  seedTrial,
} from "../fixtures/eval-rows";

const TestLayer = Layer.merge(AbandonedWorkLive, BatchRepositoryLive).pipe(
  Layer.provide(IdGeneratorLive),
  Layer.provideMerge(testDatabase())
);

const insertedRows = (result: InsertedBatch) => {
  if (result.kind !== "inserted") {
    throw new Error(`the batch was refused as ${result.kind}`);
  }
  return result;
};

const suffix = Date.now();
const organizationId = `org_reconcile_${suffix}`;
const HOURS = 3_600_000;
const MINUTES = 60_000;

const run = <A, E>(
  effect: Effect.Effect<A, E, AbandonedWork | BatchRepository | Database>
) => Effect.runPromise(effect.pipe(Effect.provide(TestLayer)));

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
      seeded.quietLocal = await seedRun(db, {
        createdAt: new Date(Date.now() - 20 * MINUTES),
        lastSeenAt: new Date(Date.now() - 15 * MINUTES),
        local: true,
        organizationId,
        tag: `rec_quiet_${suffix}`,
      });
      seeded.silentLocal = await seedRun(db, {
        createdAt: new Date(Date.now() - 20 * MINUTES),
        local: true,
        organizationId,
        tag: `rec_silent_${suffix}`,
      });
      seeded.heardLocal = await seedRun(db, {
        createdAt: new Date(Date.now() - 20 * MINUTES),
        lastSeenAt: new Date(Date.now() - MINUTES),
        local: true,
        organizationId,
        tag: `rec_heard_${suffix}`,
      });
      seeded.recentHosted = await seedRun(db, {
        createdAt: new Date(Date.now() - 20 * MINUTES),
        organizationId,
        tag: `rec_hosted_${suffix}`,
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

  it("closes a local batch whose machine went quiet, and spares one still beating, one from a CLI that never beats, and a hosted one", async () => {
    await run(reconcile(Duration.hours(6)));

    const quiet = await read(seeded.quietLocal as SeededRun);
    expect(quiet.batch?.status).toBe("failed");
    expect(quiet.batch?.failure).toBe(
      "abandoned: the machine running this stopped reporting"
    );
    expect(quiet.run?.status).toBe("failed");

    const heard = await read(seeded.heardLocal as SeededRun);
    expect(heard.batch?.status).toBe("running");
    expect(heard.run?.status).toBe("running");

    const silent = await read(seeded.silentLocal as SeededRun);
    expect(silent.batch?.status).toBe("running");

    const hosted = await read(seeded.recentHosted as SeededRun);
    expect(hosted.batch?.status).toBe("running");
    expect(hosted.run?.status).toBe("running");
  });

  it("leaves work it already closed as it was", async () => {
    const before = await read(seeded.stale as SeededRun);
    await run(reconcile(Duration.hours(6)));
    const after = await read(seeded.stale as SeededRun);

    expect(after.run?.finishedAt).toEqual(before.run?.finishedAt ?? null);
    expect(after.batch?.finishedAt).toEqual(before.batch?.finishedAt ?? null);
    expect(after.trials).toEqual(before.trials);
  });

  it("closes a local batch whose machine never beat once, voiding the trials it never reported", async () => {
    const fixture = await withDb((db) =>
      seedRun(db, {
        batchStatus: "finished",
        organizationId,
        runStatus: "finished",
        tag: `rec_unbeaten_${suffix}`,
      })
    );
    const inserted = await run(
      Effect.gen(function* () {
        yield* TestClock.setTime(Date.now() - 15 * MINUTES);
        return yield* (yield* BatchRepository).insert({
          checksIn: true,
          idempotency: null,
          limit: null,
          local: true,
          organizationId,
          runs: [
            {
              caseVersionInternalId: fixture.versionInternalId,
              harnessCredentialRef: null,
              harnessCredentialRevision: null,
              harnessVersion: "0.144.4",
              profileInternalId: null,
              sandboxCredentialRef: null,
              sandboxCredentialRevision: null,
              trialCount: 2,
              variantInternalId: fixture.variantInternalId,
            },
          ],
          startedBy: null,
          trigger: null,
        });
      }).pipe(Effect.provide(TestContext.TestContext))
    );
    const { internalId, runInternalIds } = insertedRows(inserted);
    const runInternalId = runInternalIds[0] ?? "";
    await withDb((db) =>
      seedTrial(db, {
        finishedAt: new Date(),
        internalId: `etri_rec_unbeaten_${suffix}`,
        ordinal: 1,
        runInternalId,
        startedAt: new Date(),
        status: "passed",
      })
    );

    await run(reconcile(Duration.hours(6)));

    const closed = await withDb(async (db) => ({
      batch: (
        await db
          .select({ failure: evalBatch.failure, status: evalBatch.status })
          .from(evalBatch)
          .where(eq(evalBatch.internalId, internalId))
      )[0],
      runs: await db
        .select({ status: evalRun.status })
        .from(evalRun)
        .where(eq(evalRun.batchInternalId, internalId)),
      trials: await db
        .select({
          failure: evalTrial.failure,
          ordinal: evalTrial.ordinal,
          status: evalTrial.status,
        })
        .from(evalTrial)
        .where(eq(evalTrial.runInternalId, runInternalId))
        .orderBy(asc(evalTrial.ordinal)),
    }));

    expect(closed).toEqual({
      batch: {
        failure: "abandoned: the machine running this stopped reporting",
        status: "failed",
      },
      runs: [{ status: "failed" }],
      trials: [
        { failure: null, ordinal: 1, status: "passed" },
        {
          failure: "abandoned: the machine running this stopped reporting",
          ordinal: 2,
          status: "void",
        },
      ],
    });
  });
});

describe.skipIf(skipWithoutDatabase())(
  "a local batch from a CLI that never checks in",
  () => {
    const olderId = `org_reconcile_older_${suffix}`;

    beforeAll(() => withDb((db) => seedOrganization(db, olderId)));

    const startedLongAgo = (checksIn: boolean, tag: string) =>
      Effect.gen(function* () {
        const fixture = yield* Database.pipe(
          Effect.flatMap((db) =>
            Effect.promise(() =>
              seedRun(db, {
                batchStatus: "finished",
                organizationId: olderId,
                runStatus: "finished",
                tag,
              })
            )
          )
        );
        yield* TestClock.setTime(Date.now() - 15 * MINUTES);
        const inserted = yield* (yield* BatchRepository).insert({
          checksIn,
          idempotency: null,
          limit: null,
          local: true,
          organizationId: olderId,
          runs: [
            {
              caseVersionInternalId: fixture.versionInternalId,
              harnessCredentialRef: null,
              harnessCredentialRevision: null,
              harnessVersion: "0.144.4",
              profileInternalId: null,
              sandboxCredentialRef: null,
              sandboxCredentialRevision: null,
              trialCount: 1,
              variantInternalId: fixture.variantInternalId,
            },
          ],
          startedBy: null,
          trigger: null,
        });
        return insertedRows(inserted).internalId;
      }).pipe(Effect.provide(TestContext.TestContext));

    const statusOf = (internalId: string) =>
      withDb(async (db) => {
        const [row] = await db
          .select({ status: evalBatch.status })
          .from(evalBatch)
          .where(eq(evalBatch.internalId, internalId));
        return row?.status;
      });

    it("leaves local batches uncounted, and closes the quiet one", async () => {
      const older = await run(startedLongAgo(false, `rec_older_${suffix}`));
      const newer = await run(startedLongAgo(true, `rec_newer_${suffix}`));

      const counted = await run(
        Effect.flatMap(BatchRepository, (batches) => batches.inFlight(olderId))
      );
      await run(reconcile(Duration.hours(6)));

      expect({
        counted,
        newer: await statusOf(newer),
        older: await statusOf(older),
      }).toEqual({ counted: 0, newer: "failed", older: "running" });
    });
  }
);

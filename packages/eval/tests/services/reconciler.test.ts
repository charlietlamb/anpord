import { beforeAll, describe, expect, it } from "bun:test";
import { Database, DatabaseLive } from "@anpord/db/client";
import { DatabaseConfig } from "@anpord/db/config";
import { organization } from "@anpord/db/schema/auth/organizations";
import { evalCell } from "@anpord/db/schema/evals/eval-cells";
import { evalRun } from "@anpord/db/schema/evals/eval-runs";
import { evalTask } from "@anpord/db/schema/evals/eval-tasks";
import { evalTrial } from "@anpord/db/schema/evals/eval-trials";
import { IdGeneratorLive } from "@anpord/ids/layer";
import { eq } from "drizzle-orm";
import { Duration, Effect, Layer, Redacted } from "effect";
import { AbandonedWorkLive } from "../../src/repositories/abandoned-work";
import { Reconciler, ReconcilerLive } from "../../src/services/reconciler";
import { skipWithoutDatabase } from "../fixtures/database";
import { taskFixture } from "../fixtures/eval-rows";

const URL = process.env.EVAL_TEST_DATABASE_URL;

const TestLayer = ReconcilerLive.pipe(
  Layer.provide(AbandonedWorkLive),
  Layer.provide(IdGeneratorLive),
  Layer.provideMerge(DatabaseLive),
  Layer.provide(
    Layer.succeed(DatabaseConfig, {
      poolMax: 4,
      statementTimeout: Duration.seconds(30),
      url: Redacted.make(URL ?? ""),
    })
  )
);

const suffix = Date.now();
const organizationId = `org_rec2_${suffix}`;
const OLD = new Date(Date.now() - 12 * 3_600_000);

const run = <A, E>(effect: Effect.Effect<A, E, Database | Reconciler>) =>
  Effect.runPromise(
    effect.pipe(Effect.provide(TestLayer), Effect.scoped) as Effect.Effect<A, E>
  );

const seedEmptyRun = async (tag: string, createdAt: Date) => {
  await run(
    Effect.gen(function* () {
      const db = yield* Database;

      yield* Effect.promise(async () => {
        await db.insert(evalRun).values({
          cellCount: 1,
          createdAt,
          id: `run_${tag}`,
          internalId: `runint_${tag}`,
          organizationId,
          status: "running",
          trialCount: 1,
        });
      });
    })
  );
};

const seedRun = async (tag: string, createdAt: Date) => {
  await run(
    Effect.gen(function* () {
      const db = yield* Database;

      yield* Effect.promise(async () => {
        await db.insert(evalRun).values({
          cellCount: 1,
          createdAt,
          id: `run_${tag}`,
          internalId: `runint_${tag}`,
          organizationId,
          status: "running",
          trialCount: 1,
        });

        await db.insert(evalCell).values({
          cellKey: `key_${tag}`,
          createdAt,
          harness: "codex",
          harnessVersion: "0.144.4",
          internalId: `cellint_${tag}`,
          model: "gpt-5",
          prompt: "do the thing",
          provider: "daytona",
          runInternalId: `runint_${tag}`,
          status: "running",
          taskInternalId: `taskint_${suffix}`,
        });
      });
    })
  );
};

describe.skipIf(skipWithoutDatabase())("Reconciler", () => {
  beforeAll(async () => {
    await run(
      Effect.gen(function* () {
        const db = yield* Database;

        yield* Effect.promise(async () => {
          await db
            .insert(organization)
            .values({
              createdAt: new Date(),
              id: organizationId,
              name: "reconcile",
              slug: `rec2-${suffix}`,
            })
            .onConflictDoNothing();

          await db.insert(evalTask).values(
            taskFixture.values({
              id: `task_${suffix}`,
              internalId: `taskint_${suffix}`,
              organizationId,
            })
          );
        });
      })
    );

    await seedRun(`old${suffix}`, OLD);
    await seedRun(`fresh${suffix}`, new Date());
  });

  it("closes abandoned work and leaves live work alone", async () => {
    const swept = await run(
      Effect.gen(function* () {
        const reconciler = yield* Reconciler;

        return yield* reconciler.sweep({ olderThan: Duration.hours(6) });
      })
    );

    expect(swept.runs).toBeGreaterThanOrEqual(1);

    const after = await run(
      Effect.gen(function* () {
        const db = yield* Database;

        return yield* Effect.promise(async () => ({
          fresh: await db
            .select()
            .from(evalRun)
            .where(eq(evalRun.internalId, `runint_fresh${suffix}`)),
          freshCell: await db
            .select()
            .from(evalCell)
            .where(eq(evalCell.internalId, `cellint_fresh${suffix}`)),
          old: await db
            .select()
            .from(evalRun)
            .where(eq(evalRun.internalId, `runint_old${suffix}`)),
          oldCell: await db
            .select()
            .from(evalCell)
            .where(eq(evalCell.internalId, `cellint_old${suffix}`)),
        }));
      })
    );

    expect(after.old[0]?.status).toBe("failed");
    expect(after.old[0]?.failure).toContain("abandoned");
    expect(after.old[0]?.finishedAt).not.toBeNull();
    expect(after.oldCell[0]?.status).toBe("failed");

    expect(after.fresh[0]?.status).toBe("running");
    expect(after.freshCell[0]?.status).toBe("running");
  });

  it("closes a run that registered no cells, and spares a new one", async () => {
    const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000);

    await seedEmptyRun(`stale${suffix}`, minutesAgo(30));
    await seedEmptyRun(`justnow${suffix}`, minutesAgo(1));

    await run(
      Effect.gen(function* () {
        const reconciler = yield* Reconciler;

        return yield* reconciler.sweep({ olderThan: Duration.hours(6) });
      })
    );

    const after = await run(
      Effect.gen(function* () {
        const db = yield* Database;

        return yield* Effect.promise(async () => ({
          justnow: await db
            .select()
            .from(evalRun)
            .where(eq(evalRun.internalId, `runint_justnow${suffix}`)),
          stale: await db
            .select()
            .from(evalRun)
            .where(eq(evalRun.internalId, `runint_stale${suffix}`)),
        }));
      })
    );

    expect(after.stale[0]?.status).toBe("failed");
    expect(after.stale[0]?.failure).toContain("did not start it");

    expect(after.justnow[0]?.status).toBe("running");
  });

  /** A run can fail while its trials still claim to be running: the run and
   * the cell were swept and the trial was not, so a table of readings showed a
   * spinner beside a run that died ten hours ago. */
  it("closes a trial left running under a run that failed", async () => {
    await run(
      Effect.gen(function* () {
        const db = yield* Database;

        yield* Effect.promise(async () => {
          await db.insert(evalTrial).values({
            cellInternalId: `cellint_old${suffix}`,
            createdAt: new Date(Date.now() - 7 * 60 * 60 * 1000),
            internalId: `trialint_old${suffix}`,
            ordinal: 1,
            provider: "daytona",
            status: "running",
          });
        });
      })
    );

    await run(
      Effect.gen(function* () {
        const reconciler = yield* Reconciler;

        return yield* reconciler.sweep({ olderThan: Duration.hours(6) });
      })
    );

    const after = await run(
      Effect.gen(function* () {
        const db = yield* Database;

        return yield* Effect.promise(() =>
          db
            .select()
            .from(evalTrial)
            .where(eq(evalTrial.internalId, `trialint_old${suffix}`))
        );
      })
    );

    expect(after[0]?.status).toBe("void");
    expect(after[0]?.finishedAt).not.toBeNull();
    /* Void and not failed: nothing decided it, so it must not move a pass
       rate. Every distribution counts void trials apart from scored ones. */
    expect(after[0]?.passed).toBeNull();
  });
});

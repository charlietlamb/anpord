import { beforeAll, describe, expect, it } from "bun:test";
import { Database, DatabaseLive } from "@anpord/db/client";
import { DatabaseConfig } from "@anpord/db/config";
import { organization } from "@anpord/db/schema/auth/organizations";
import { evalCell } from "@anpord/db/schema/evals/eval-cells";
import { evalRun } from "@anpord/db/schema/evals/eval-runs";
import { evalTask } from "@anpord/db/schema/evals/eval-tasks";
import { IdGeneratorLive } from "@anpord/ids/layer";
import { eq } from "drizzle-orm";
import { Duration, Effect, Layer, Redacted } from "effect";
import { Reconciler, ReconcilerLive } from "../../src/services/reconcile";
import { taskFixture } from "../fixtures/eval-rows";

const URL = process.env.EVAL_TEST_DATABASE_URL;

const TestLayer = ReconcilerLive.pipe(
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
          provider: "daytona",
          runInternalId: `runint_${tag}`,
          status: "running",
          taskInternalId: `taskint_${suffix}`,
        });
      });
    })
  );
};

describe.skipIf(!URL)("Reconciler", () => {
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

  /** A run whose process was killed stays running forever, because the only
   * witness to its death was the process itself. */
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

    /* A grid legitimately takes a long time, and closing a live run would be
       worse than leaving a dead one open a little longer. */
    expect(after.fresh[0]?.status).toBe("running");
    expect(after.freshCell[0]?.status).toBe("running");
  });
});

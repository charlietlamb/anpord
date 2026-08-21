import { skipWithoutDatabase } from "../fixtures/database";
import { beforeAll, describe, expect, it } from "bun:test";
import { Database, DatabaseLive } from "@anpord/db/client";
import { DatabaseConfig } from "@anpord/db/config";
import { organization } from "@anpord/db/schema/auth/organizations";
import { evalBaseline } from "@anpord/db/schema/evals/eval-baselines";
import { evalCell } from "@anpord/db/schema/evals/eval-cells";
import { evalEvent } from "@anpord/db/schema/evals/eval-events";
import { evalRun } from "@anpord/db/schema/evals/eval-runs";
import { evalTask } from "@anpord/db/schema/evals/eval-tasks";
import { evalTrial } from "@anpord/db/schema/evals/eval-trials";
import { IdGeneratorLive } from "@anpord/ids/layer";
import { eq } from "drizzle-orm";
import { Duration, Effect, Layer, Redacted } from "effect";
import {
  EventRetention,
  EventRetentionLive,
} from "../../src/repositories/event-retention";
import { taskFixture } from "../fixtures/eval-rows";

const URL = process.env.EVAL_TEST_DATABASE_URL;

const TestLayer = EventRetentionLive.pipe(
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
const organizationId = `org_ret_${suffix}`;
const ANCIENT = new Date(Date.now() - 120 * 86_400_000);

const run = <A, E>(effect: Effect.Effect<A, E, Database | EventRetention>) =>
  Effect.runPromise(
    effect.pipe(Effect.provide(TestLayer), Effect.scoped) as Effect.Effect<A, E>
  );

/** Two old cells, identical but for one being a promoted baseline. */
const seed = async (tag: string, promoted: boolean) => {
  await run(
    Effect.gen(function* () {
      const db = yield* Database;

      yield* Effect.promise(async () => {
        await db.insert(evalRun).values({
          cellCount: 1,
          id: `run_${tag}`,
          internalId: `runint_${tag}`,
          organizationId,
          status: "finished",
          trialCount: 1,
        });

        await db.insert(evalCell).values({
          cellKey: `key_${tag}`,
          harness: "codex",
          harnessVersion: "0.144.4",
          internalId: `cellint_${tag}`,
          model: "gpt-5",
          provider: "daytona",
          runInternalId: `runint_${tag}`,
          status: "finished",
          taskInternalId: `taskint_${suffix}`,
        });

        await db.insert(evalTrial).values({
          attempt: 1,
          cellInternalId: `cellint_${tag}`,
          internalId: `trialint_${tag}`,
          ordinal: 1,
          passed: true,
          provider: "daytona",
          status: "passed",
        });

        await db.insert(evalEvent).values({
          at: ANCIENT,
          internalId: `evint_${tag}`,
          kind: "Command",
          payload: { _tag: "Command", command: "true" },
          seq: 0,
          trialInternalId: `trialint_${tag}`,
        });

        if (promoted) {
          await db.insert(evalBaseline).values({
            cellInternalId: `cellint_${tag}`,
            cellKey: `key_${tag}`,
            internalId: `basint_${tag}`,
            organizationId,
          });
        }
      });
    })
  );
};

describe.skipIf(skipWithoutDatabase())("EventRetention", () => {
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
              name: "retention",
              slug: `ret-${suffix}`,
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

    await seed(`plain${suffix}`, false);
    await seed(`kept${suffix}`, true);
  });

  it("sweeps an old journal but keeps the baseline's", async () => {
    const deleted = await run(
      Effect.gen(function* () {
        const retention = yield* EventRetention;

        return yield* retention.sweep({ olderThanDays: 30 });
      })
    );

    expect(deleted).toBeGreaterThanOrEqual(1);

    const remaining = await run(
      Effect.gen(function* () {
        const db = yield* Database;

        return yield* Effect.promise(async () => ({
          kept: await db
            .select()
            .from(evalEvent)
            .where(eq(evalEvent.trialInternalId, `trialint_kept${suffix}`)),
          plain: await db
            .select()
            .from(evalEvent)
            .where(eq(evalEvent.trialInternalId, `trialint_plain${suffix}`)),
        }));
      })
    );

    expect(remaining.plain).toHaveLength(0);
    /* The promoted cell keeps its evidence: a baseline whose journal was
       swept cannot support the regression argument it exists for. */
    expect(remaining.kept).toHaveLength(1);
  });
});

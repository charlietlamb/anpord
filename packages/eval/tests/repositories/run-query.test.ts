import { beforeAll, describe, expect, it } from "bun:test";
import { Database, DatabaseLive } from "@anpord/db/client";
import { DatabaseConfig } from "@anpord/db/config";
import { organization } from "@anpord/db/schema/auth/organizations";
import { evalCell } from "@anpord/db/schema/evals/eval-cells";
import { evalRun } from "@anpord/db/schema/evals/eval-runs";
import { evalTask } from "@anpord/db/schema/evals/eval-tasks";
import { evalTrial } from "@anpord/db/schema/evals/eval-trials";
import { IdGeneratorLive } from "@anpord/ids/layer";
import { Duration, Effect, Layer, Option, Redacted } from "effect";
import { CellKey } from "../../src/domain/cell";
import { RunQuery, RunQueryLive } from "../../src/repositories/run-query";

const URL = process.env.EVAL_TEST_DATABASE_URL;

const TestLayer = RunQueryLive.pipe(
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
const mine = `org_q_mine_${suffix}`;
const theirs = `org_q_theirs_${suffix}`;
const sharedKey = CellKey.make(`sharedkey_${suffix}`);

const run = <A, E>(effect: Effect.Effect<A, E, RunQuery | Database>) =>
  Effect.runPromise(
    effect.pipe(Effect.provide(TestLayer), Effect.scoped) as Effect.Effect<A, E>
  );

/** Two organizations with the same cell key, because a key is a content hash
 * and carries no tenant. If history were read by key alone both would share a
 * baseline. */
const seed = async (organizationId: string, tag: string, passed: boolean) => {
  await run(
    Effect.gen(function* () {
      const db = yield* Database;

      yield* Effect.promise(async () => {
        await db
          .insert(organization)
          .values({
            createdAt: new Date(),
            id: organizationId,
            name: tag,
            slug: `${tag}-${suffix}`,
          })
          .onConflictDoNothing();

        await db.insert(evalTask).values({
          id: `task_${tag}`,
          internalId: `taskint_${tag}`,
          name: tag,
          organizationId,
          prompt: "p",
          verifyCommand: "true",
          workspace: "/tmp/x",
        });

        await db.insert(evalRun).values({
          cellCount: 1,
          finishedAt: new Date(),
          id: `run_${tag}`,
          internalId: `runint_${tag}`,
          organizationId,
          status: "finished",
          trialCount: 2,
        });

        await db.insert(evalCell).values({
          cellKey: sharedKey,
          harness: "codex",
          harnessVersion: "0.144.4",
          internalId: `cellint_${tag}`,
          model: "gpt-5",
          provider: "daytona",
          runInternalId: `runint_${tag}`,
          status: "finished",
          taskInternalId: `taskint_${tag}`,
        });

        await db.insert(evalTrial).values(
          [1, 2].map((ordinal) => ({
            attempt: 1,
            cellInternalId: `cellint_${tag}`,
            commandCount: 3,
            exitCode: passed ? 0 : 1,
            finishedAt: new Date(),
            internalId: `trialint_${tag}_${ordinal}`,
            modelMs: 100,
            ordinal,
            passed,
            provider: "daytona",
            sandboxMs: 50,
            status: passed ? "passed" : "failed",
            voidFields: [],
          }))
        );
      });
    })
  );
};

describe.skipIf(!URL)("RunQuery", () => {
  beforeAll(async () => {
    await seed(mine, `qmine${suffix}`, true);
    await seed(theirs, `qtheirs${suffix}`, false);
  });

  it("reads a run with its cells and distributions", async () => {
    const found = await run(
      Effect.gen(function* () {
        const query = yield* RunQuery;

        return yield* query.findRun(mine, `run_qmine${suffix}`);
      })
    );

    expect(Option.isSome(found)).toBe(true);

    if (Option.isNone(found)) {
      return;
    }

    expect(found.value.cells).toHaveLength(1);
    expect(found.value.cells[0]?.distribution.passRate).toBe(1);
    expect(found.value.cells[0]?.distribution.scored).toBe(2);
  });

  it("refuses a run belonging to another organization", async () => {
    const found = await run(
      Effect.gen(function* () {
        const query = yield* RunQuery;

        return yield* query.findRun(mine, `run_qtheirs${suffix}`);
      })
    );

    expect(Option.isNone(found)).toBe(true);
  });

  /** The property that matters most here. Both organizations have a cell with
   * an identical key, and one must never see the other's readings. */
  it("scopes cell history to the organization", async () => {
    const history = await run(
      Effect.gen(function* () {
        const query = yield* RunQuery;

        return yield* query.findCellHistory({
          cellKey: sharedKey,
          limit: 10,
          organizationId: mine,
        });
      })
    );

    expect(history).toHaveLength(1);
    expect(history[0]?.runId).toBe(`run_qmine${suffix}`);
    expect(history[0]?.distribution.passRate).toBe(1);
  });

  it("lists only the organization's runs", async () => {
    const runs = await run(
      Effect.gen(function* () {
        const query = yield* RunQuery;

        return yield* query.listRuns({ limit: 50, organizationId: mine });
      })
    );

    expect(runs.every((row) => row.organizationId === mine)).toBe(true);
    expect(runs.some((row) => row.id === `run_qmine${suffix}`)).toBe(true);
  });
});

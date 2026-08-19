import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Database, DatabaseLive } from "@anpord/db/client";
import { DatabaseConfig } from "@anpord/db/config";
import { organization } from "@anpord/db/schema/auth/organizations";
import { eq } from "drizzle-orm";
import { Duration, Effect, Layer, Option, Redacted } from "effect";
import { cellKeyOf } from "../../src/domain/cell";
import { outcomeOf } from "../../src/domain/trial";
import { EvalRepositoriesLive } from "../../src/layer";
import { RunRepository } from "../../src/repositories/run-repository";
import { TaskRepository } from "../../src/repositories/task-repository";
import { TrialRepository } from "../../src/repositories/trial-repository";

const URL = process.env.EVAL_TEST_DATABASE_URL;

const DatabaseConfigTest = Layer.succeed(DatabaseConfig, {
  poolMax: 4,
  statementTimeout: Duration.seconds(15),
  url: Redacted.make(URL ?? ""),
});

const TestLayer = EvalRepositoriesLive.pipe(
  Layer.provideMerge(DatabaseLive),
  Layer.provide(DatabaseConfigTest)
);

const organizationId = `org_test_${Date.now()}`;

const run = <A, E>(
  effect: Effect.Effect<
    A,
    E,
    TaskRepository | RunRepository | TrialRepository | Database
  >
) =>
  Effect.runPromise(
    Effect.provide(effect, TestLayer) as Effect.Effect<A, E, never>
  );

describe.if(Boolean(URL))("trial repository against a real database", () => {
  beforeAll(async () => {
    await run(
      Effect.gen(function* () {
        const db = yield* Database;
        yield* Effect.promise(() =>
          db.insert(organization).values({
            createdAt: new Date(),
            id: organizationId,
            name: "test org",
            slug: organizationId,
          })
        );
      })
    );
  });

  afterAll(async () => {
    await run(
      Effect.gen(function* () {
        const db = yield* Database;
        yield* Effect.promise(() =>
          db.delete(organization).where(eq(organization.id, organizationId))
        );
      })
    );
  });

  it("records a trial from queued to settled", async () => {
    const found = await run(
      Effect.gen(function* () {
        const tasks = yield* TaskRepository;
        const runs = yield* RunRepository;
        const trials = yield* TrialRepository;

        const task = yield* tasks.insert({
          id: "fix-parser",
          name: "Fix the parser",
          organizationId,
          prompt: "the parser rejects valid input, fix it",
          setupCommand: null,
          verifyCommand: "bun test",
          workspace: "/tmp/anpord-task",
        });

        const created = yield* runs.insert({
          cellCount: 1,
          organizationId,
          startedBy: null,
          trialCount: 1,
        });

        const cell = yield* runs.insertCell({
          cellKey: cellKeyOf({
            harness: "none",
            harnessVersion: "0",
            model: "none",
            provider: "daytona",
            taskId: task.id,
            taskVersion: "1",
          }),
          harness: "none",
          harnessVersion: "0",
          model: "none",
          provider: "daytona",
          runInternalId: created.internalId,
          taskInternalId: task.internalId,
        });

        const trial = yield* trials.insert({
          cellInternalId: cell.internalId,
          ordinal: 1,
          provider: "daytona",
        });

        yield* trials.claim(trial.internalId, "sbx-abc", new Date());
        yield* trials.settle({
          attempt: 1,
          finishedAt: new Date(),
          internalId: trial.internalId,
          outcome: outcomeOf({
            commandCount: 5,
            exitCode: 0,
            fingerprint: { tests: "1 pass" },
            modelMs: 0,
            sandboxMs: 4500,
          }),
        });

        return yield* trials.findById(trial.internalId);
      })
    );

    const trial = Option.getOrThrow(found);

    expect(trial.status).toBe("passed");
    expect(trial.passed).toBe(true);
    expect(trial.sandboxId).toBe("sbx-abc");
    expect(trial.commandCount).toBe(5);
  });

  /* The gate has to survive the round trip: a void trial must come back out of
     the database as void, carrying the fields that voided it, rather than as a
     failure that a pass rate would then count. */
  it("stores a voided trial as void, not as a failure", async () => {
    const found = await run(
      Effect.gen(function* () {
        const tasks = yield* TaskRepository;
        const runs = yield* RunRepository;
        const trials = yield* TrialRepository;

        const task = yield* tasks.insert({
          id: `void-task-${Date.now()}`,
          name: "Void",
          organizationId,
          prompt: "x",
          setupCommand: null,
          verifyCommand: "true",
          workspace: "/tmp/x",
        });

        const created = yield* runs.insert({
          cellCount: 1,
          organizationId,
          startedBy: null,
          trialCount: 1,
        });

        const cell = yield* runs.insertCell({
          cellKey: cellKeyOf({
            harness: "none",
            harnessVersion: "0",
            model: "none",
            provider: "daytona",
            taskId: task.id,
            taskVersion: "1",
          }),
          harness: "none",
          harnessVersion: "0",
          model: "none",
          provider: "daytona",
          runInternalId: created.internalId,
          taskInternalId: task.internalId,
        });

        const trial = yield* trials.insert({
          cellInternalId: cell.internalId,
          ordinal: 1,
          provider: "daytona",
        });

        yield* trials.settle({
          attempt: 1,
          finishedAt: new Date(),
          internalId: trial.internalId,
          outcome: outcomeOf({
            commandCount: 0,
            exitCode: -1,
            fingerprint: {
              tests: "fork/exec /usr/bin/zsh: no such file or directory",
            },
            modelMs: 0,
            sandboxMs: 0,
          }),
        });

        return yield* trials.findById(trial.internalId);
      })
    );

    const trial = Option.getOrThrow(found);

    expect(trial.status).toBe("void");
    expect(trial.passed).toBe(false);
    expect(trial.voidFields).toEqual(["tests"]);
  });
});

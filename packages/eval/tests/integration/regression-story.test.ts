import { beforeAll, describe, expect, it } from "bun:test";
import { Database, DatabaseLive } from "@anpord/db/client";
import { DatabaseConfig } from "@anpord/db/config";
import { organization } from "@anpord/db/schema/auth/organizations";
import { IdGeneratorLive } from "@anpord/ids/layer";
import { Duration, Effect, Layer, Option, Redacted } from "effect";
import { cellKeyOf } from "../../src/domain/cell";
import { EvalBaselinesLive } from "../../src/layer";
import { RunRepository } from "../../src/repositories/run-repository";
import { TrialRecorder } from "../../src/repositories/trial-record";
import { Baselines } from "../../src/services/baselines";
import { skipWithoutDatabase } from "../fixtures/database";
import { statusOf, taskFixture } from "../fixtures/eval-rows";

const URL = process.env.EVAL_TEST_DATABASE_URL;

const TestLayer = EvalBaselinesLive.pipe(
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
const organizationId = `org_story_${suffix}`;
const taskInternalId = `taskint_story_${suffix}`;

type Tags = Baselines | Database | RunRepository | TrialRecorder;

const run = <A, E>(effect: Effect.Effect<A, E, Tags>) =>
  Effect.runPromise(
    effect.pipe(Effect.provide(TestLayer), Effect.scoped) as Effect.Effect<A, E>
  );

const cellKey = cellKeyOf({
  harness: "codex",
  model: "gpt-5",
  profile: null,
  provider: "daytona",
  taskId: `task_story_${suffix}`,
  taskVersion: taskInternalId,
});

const recordCell = (input: {
  readonly passing: number;
  readonly total: number;
  readonly voided: number;
}) =>
  Effect.gen(function* () {
    const runs = yield* RunRepository;
    const recorder = yield* TrialRecorder;

    const created = yield* runs.insert({
      cellCount: 1,
      name: "regression-story",
      organizationId,
      startedBy: null,
      trialCount: input.total,
    });

    const cell = yield* runs.insertCell({
      cellKey,
      harness: "codex",
      harnessVersion: "0.144.4",
      model: "gpt-5",
      profileInternalId: null,
      prompt: "do the thing",
      provider: "daytona",
      runInternalId: created.internalId,
      taskInternalId,
    });

    yield* Effect.forEach(
      Array.from({ length: input.total }, (_, index) => index),
      (index) => {
        const isVoid = index < input.voided;
        const passed = !isVoid && index - input.voided < input.passing;

        return Effect.gen(function* () {
          const { trialInternalId } = yield* recorder.open({
            cellInternalId: cell.internalId,
            ordinal: index + 1,
            provider: "daytona",
            startedAt: new Date(),
          });

          yield* recorder.append({
            events: [
              {
                _tag: "Command",
                command: "node --test",
                exitCode: passed ? 0 : 1,
                output: isVoid ? "" : "ran",
              },
            ],
            from: 0,
            trialInternalId,
          });

          yield* recorder.settle({
            finishedAt: new Date(),
            outcome: {
              commandCount: isVoid ? 0 : 10,
              exitCode: passed ? 0 : 1,
              modelMs: 100,
              passed,
              sandboxMs: 50,
              status: statusOf({ passed, voided: isVoid }),
              verifySteps: [],
              voidFields: isVoid ? ["stdout"] : [],
            },
            prepared: {},
            sandboxId: `sbx_${index}`,
            trialInternalId,
            usage: null,
          });
        });
      },

      { concurrency: input.total, discard: true }
    );

    yield* runs.finish({
      failure: null,
      finishedAt: new Date(),
      internalId: created.internalId,
      status: "finished",
    });

    return { cellInternalId: cell.internalId, runId: created.id };
  });

describe.skipIf(skipWithoutDatabase())("the regression story", () => {
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
              name: "story",
              slug: `story-${suffix}`,
            })
            .onConflictDoNothing();

          await db.insert(taskFixture.table).values(
            taskFixture.values({
              id: `task_story_${suffix}`,
              internalId: taskInternalId,
              organizationId,
            })
          );
        });
      })
    );
  });

  it("runs the whole loop: accept, regress, then refuse to lie", async () => {
    const healthy = await run(recordCell({ passing: 5, total: 5, voided: 0 }));

    const accepted = await run(
      Effect.gen(function* () {
        const baselines = yield* Baselines;

        yield* baselines.promoteIfAbsent({
          cellInternalId: healthy.cellInternalId,
          cellKey,
          organizationId,
        });

        return yield* baselines.find(organizationId, cellKey);
      })
    );

    expect(Option.isSome(accepted)).toBe(true);

    if (Option.isNone(accepted)) {
      return;
    }

    expect(accepted.value.distribution.passRate).toBe(1);

    const worse = await run(recordCell({ passing: 1, total: 5, voided: 0 }));

    const regression = await run(
      Effect.gen(function* () {
        const baselines = yield* Baselines;

        return yield* baselines.compareRun(organizationId, worse.runId);
      })
    );

    const regressed = regression[0]?.comparison;

    expect(regressed && Option.isSome(regressed)).toBe(true);

    if (!regressed || Option.isNone(regressed)) {
      return;
    }

    expect(regressed.value.verdict).toBe("regressed");
    expect(regressed.value.delta).toBeCloseTo(-0.8);

    const outage = await run(recordCell({ passing: 0, total: 5, voided: 5 }));

    const refused = await run(
      Effect.gen(function* () {
        const baselines = yield* Baselines;

        return yield* baselines.compareRun(organizationId, outage.runId);
      })
    );

    const verdict = refused[0]?.comparison;

    expect(verdict && Option.isSome(verdict)).toBe(true);

    if (!verdict || Option.isNone(verdict)) {
      return;
    }

    expect(verdict.value.verdict).toBe("incomparable");
    expect(verdict.value.delta).toBe(0);
    expect(verdict.value.reason).toBe("this run has no scored trials");
  }, 30_000);
});

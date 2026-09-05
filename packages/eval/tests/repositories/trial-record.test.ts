import { beforeAll, describe, expect, it } from "bun:test";
import { Database, DatabaseLive } from "@anpord/db/client";
import { DatabaseConfig } from "@anpord/db/config";
import { organization } from "@anpord/db/schema/auth/organizations";
import { evalCell } from "@anpord/db/schema/evals/eval-cells";
import { evalEvent } from "@anpord/db/schema/evals/eval-events";
import { evalRun } from "@anpord/db/schema/evals/eval-runs";
import { evalTask } from "@anpord/db/schema/evals/eval-tasks";
import { evalTrial } from "@anpord/db/schema/evals/eval-trials";
import { IdGeneratorLive } from "@anpord/ids/layer";
import { eq } from "drizzle-orm";
import { Duration, Effect, Layer, Option, Redacted } from "effect";
import type { HarnessEvent } from "../../src/domain/harness-event";
import type { TrialOutcome } from "../../src/domain/trial";
import {
  TrialRecorder,
  TrialRecorderLive,
} from "../../src/repositories/trial-record";
import { skipWithoutDatabase } from "../fixtures/database";

const URL = process.env.EVAL_TEST_DATABASE_URL;

const TestLayer = TrialRecorderLive.pipe(
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
const organizationId = `org_rec_${suffix}`;
const cellInternalId = `cell_rec_${suffix}`;

const outcome: TrialOutcome = {
  commandCount: 3,
  exitCode: 0,
  modelMs: 1000,
  passed: true,
  sandboxMs: 500,
  status: "passed",
  verifySteps: [],
  voidFields: [],
};

const events: readonly HarnessEvent[] = [
  { _tag: "Started", model: "gpt-5", sessionId: "session_1" },
  {
    _tag: "Command",
    command: "bun test",
    exitCode: 0,
    output: "ok",
  },
];

const run = <A, E>(effect: Effect.Effect<A, E, TrialRecorder | Database>) =>
  Effect.runPromise(
    effect.pipe(Effect.provide(TestLayer), Effect.scoped) as Effect.Effect<A, E>
  );

describe.skipIf(skipWithoutDatabase())("TrialRecorder", () => {
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
              name: "recorder test",
              slug: `rec-${suffix}`,
            })
            .onConflictDoNothing();

          await db.insert(evalTask).values({
            id: `task_${suffix}`,
            internalId: `taskint_${suffix}`,
            name: "recorder",
            organizationId,
            prompt: "do the thing",
            verifyCommand: "true",
            workspace: "/tmp/x",
          });

          await db.insert(evalRun).values({
            cellCount: 1,
            id: `run_${suffix}`,
            internalId: `runint_${suffix}`,
            organizationId,
            status: "running",
            trialCount: 1,
          });

          await db.insert(evalCell).values({
            cellKey: `key_${suffix}`,
            harness: "codex",
            harnessVersion: "0.144.4",
            internalId: cellInternalId,
            model: "gpt-5",
            prompt: "do the thing",
            provider: "daytona",
            runInternalId: `runint_${suffix}`,
            status: "running",
            taskInternalId: `taskint_${suffix}`,
          });
        });
      })
    );
  });

  it("shows the journal before the trial settles", async () => {
    const seen = await run(
      Effect.gen(function* () {
        const recorder = yield* TrialRecorder;
        const db = yield* Database;

        const { trialInternalId } = yield* recorder.open({
          cellInternalId,
          ordinal: 1,
          provider: "daytona",
          startedAt: new Date(),
        });

        yield* recorder.append({ events, from: 0, trialInternalId });

        const midFlight = yield* Effect.promise(async () => ({
          events: await db
            .select()
            .from(evalEvent)
            .where(eq(evalEvent.trialInternalId, trialInternalId)),
          trial: await db
            .select()
            .from(evalTrial)
            .where(eq(evalTrial.internalId, trialInternalId)),
        }));

        yield* recorder.settle({
          finishedAt: new Date(),
          outcome,
          prepared: {},
          sandboxId: "sbx_1",
          trialInternalId,
          usage: {
            cacheReadTokens: 0,
            cacheWriteTokens: 0,
            inputTokens: 120,
            outputTokens: 40,
            totalTokens: 160,
          },
        });

        const settled = yield* Effect.promise(() =>
          db
            .select()
            .from(evalTrial)
            .where(eq(evalTrial.internalId, trialInternalId))
        );

        return { midFlight, settled };
      })
    );

    expect(seen.midFlight.events).toHaveLength(2);
    expect(seen.midFlight.trial[0]?.status).toBe("running");

    expect(seen.midFlight.trial[0]?.passed).toBeNull();

    expect(seen.settled[0]?.status).toBe("passed");
    expect(seen.settled[0]?.passed).toBe(true);

    expect(seen.settled[0]?.usage).toEqual({
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      inputTokens: 120,
      outputTokens: 40,
      totalTokens: 160,
    });
  });

  it("ignores a batch it has already written", async () => {
    const written = await run(
      Effect.gen(function* () {
        const recorder = yield* TrialRecorder;
        const db = yield* Database;

        const { trialInternalId } = yield* recorder.open({
          cellInternalId,
          ordinal: 2,
          provider: "daytona",
          startedAt: new Date(),
        });

        yield* recorder.append({ events, from: 0, trialInternalId });
        yield* recorder.append({ events, from: 0, trialInternalId });

        return yield* Effect.promise(() =>
          db
            .select()
            .from(evalEvent)
            .where(eq(evalEvent.trialInternalId, trialInternalId))
        );
      })
    );

    expect(written).toHaveLength(2);
  });

  it("closes a trial that never reached a verdict", async () => {
    const closed = await run(
      Effect.gen(function* () {
        const recorder = yield* TrialRecorder;
        const db = yield* Database;

        const { trialInternalId } = yield* recorder.open({
          cellInternalId,
          ordinal: 3,
          provider: "daytona",
          startedAt: new Date(),
        });

        yield* recorder.abandon({ finishedAt: new Date(), trialInternalId });

        return yield* Effect.promise(() =>
          db
            .select()
            .from(evalTrial)
            .where(eq(evalTrial.internalId, trialInternalId))
        );
      })
    );

    expect(closed[0]?.status).toBe("void");

    expect(closed[0]?.passed).toBeNull();
    expect(closed[0]?.finishedAt).not.toBeNull();
  });

  /* A process that died mid-trial left its sandbox id on the row. The next
     attempt is told about it so it can destroy it before opening its own. */
  it("hands the next attempt the sandbox the last one left behind", async () => {
    const seen = await run(
      Effect.gen(function* () {
        const recorder = yield* TrialRecorder;

        const first = yield* recorder.open({
          cellInternalId,
          ordinal: 4,
          provider: "daytona",
          startedAt: new Date(),
        });

        yield* recorder.attach({
          sandboxId: "sbx-left-behind",
          trialInternalId: first.trialInternalId,
        });

        const second = yield* recorder.open({
          cellInternalId,
          ordinal: 4,
          provider: "daytona",
          startedAt: new Date(),
        });

        return { first, second };
      })
    );

    expect(Option.isNone(seen.first.priorSandboxId)).toBe(true);
    expect(seen.second.trialInternalId).toBe(seen.first.trialInternalId);
    expect(Option.getOrNull(seen.second.priorSandboxId)).toBe(
      "sbx-left-behind"
    );
  });
});

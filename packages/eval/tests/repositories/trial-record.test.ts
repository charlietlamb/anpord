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
import { Duration, Effect, Layer, Redacted } from "effect";
import type { HarnessEvent } from "../../src/domain/harness-event";
import type { TrialOutcome } from "../../src/domain/trial";
import {
  TrialRecorder,
  TrialRecorderLive,
} from "../../src/repositories/trial-record";

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

describe.skipIf(!URL)("TrialRecorder", () => {
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
            provider: "daytona",
            runInternalId: `runint_${suffix}`,
            status: "running",
            taskInternalId: `taskint_${suffix}`,
          });
        });
      })
    );
  });

  it("writes the trial and its journal together", async () => {
    const trialInternalId = await run(
      Effect.gen(function* () {
        const recorder = yield* TrialRecorder;

        return yield* recorder.record({
          cellInternalId,
          events,
          finishedAt: new Date(),
          ordinal: 1,
          outcome,
          provider: "daytona",
          sandboxId: "sbx_1",
          startedAt: new Date(),
          usage: { inputTokens: 120, outputTokens: 40, totalTokens: 160 },
        });
      })
    );

    const written = await run(
      Effect.gen(function* () {
        const db = yield* Database;

        return yield* Effect.promise(async () => ({
          events: await db
            .select()
            .from(evalEvent)
            .where(eq(evalEvent.trialInternalId, trialInternalId)),
          trials: await db
            .select()
            .from(evalTrial)
            .where(eq(evalTrial.internalId, trialInternalId)),
        }));
      })
    );

    expect(written.trials).toHaveLength(1);
    expect(written.events).toHaveLength(2);
    expect(written.trials[0]?.passed).toBe(true);
    /* Cost travelled with the trial. This column was always null before,
       so nothing could answer what a run had spent. */
    expect(written.trials[0]?.usage).toEqual({
      inputTokens: 120,
      outputTokens: 40,
      totalTokens: 160,
    });
  });

  /** The reason this module exists. A failure while writing the journal must
   * take the trial row with it, because a settled trial with no events is
   * indistinguishable from one that ran and produced nothing, which is the
   * signature the void gate reads as a broken provider. */
  it("leaves nothing behind when the journal write fails", async () => {
    const before = await run(
      Effect.gen(function* () {
        const db = yield* Database;

        return yield* Effect.promise(() =>
          db
            .select()
            .from(evalTrial)
            .where(eq(evalTrial.cellInternalId, cellInternalId))
        );
      })
    );

    /* An event whose payload cannot be serialised fails inside the
       transaction, after the trial row has already been inserted. */
    const poison = { _tag: "Command" } as unknown as HarnessEvent;
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    (poison as unknown as Record<string, unknown>).payload = circular;

    const outcomeOfWrite = await Effect.runPromise(
      Effect.gen(function* () {
        const recorder = yield* TrialRecorder;

        return yield* recorder.record({
          cellInternalId,
          events: [poison],
          finishedAt: new Date(),
          ordinal: 2,
          outcome,
          provider: "daytona",
          sandboxId: "sbx_2",
          startedAt: new Date(),
          usage: null,
        });
      }).pipe(
        Effect.provide(TestLayer),
        Effect.scoped,
        Effect.either
      ) as Effect.Effect<unknown>
    );

    const after = await run(
      Effect.gen(function* () {
        const db = yield* Database;

        return yield* Effect.promise(() =>
          db
            .select()
            .from(evalTrial)
            .where(eq(evalTrial.cellInternalId, cellInternalId))
        );
      })
    );

    expect((outcomeOfWrite as { _tag: string })._tag).toBe("Left");
    expect(after).toHaveLength(before.length);
  });
});

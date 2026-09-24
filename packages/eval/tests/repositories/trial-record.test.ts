import { beforeAll, describe, expect, it } from "bun:test";
import { createHash } from "node:crypto";
import { Database } from "@anpord/db/client";
import { evalEvent } from "@anpord/db/schema/evals/eval-events";
import { evalTrial } from "@anpord/db/schema/evals/eval-trials";
import { IdGeneratorLive } from "@anpord/ids/layer";
import {
  type EvalValidation,
  validationCapture,
  validationExecution,
} from "@anpord/schema/domain/eval-validations";
import type { HarnessEvent } from "@anpord/schema/domain/harness-event";
import type { TrialOutcome } from "@anpord/schema/domain/trial";
import { eq } from "drizzle-orm";
import { Effect, Layer, Option } from "effect";
import { judgmentsIn } from "../../src/domain/judgments";
import { trialArtifactQuery } from "../../src/repositories/trial-artifacts";
import {
  TrialRecorder,
  TrialRecorderLive,
} from "../../src/repositories/trial-record";
import { skipWithoutDatabase, testDatabase } from "../fixtures/database";
import { seedOrganization, seedRun } from "../fixtures/eval-rows";

const TestLayer = TrialRecorderLive.pipe(
  Layer.provide(IdGeneratorLive),
  Layer.provideMerge(testDatabase())
);

const suffix = Date.now();
const organizationId = `org_record_${suffix}`;
const runInternalId = `erun_record_${suffix}`;

const judged: EvalValidation = {
  ...validationExecution(
    { id: "judge:0", index: 0, kind: "judge", name: "correctness" },
    1000
  ),
  judgment: {
    choice: "correct",
    durationMs: 10,
    error: null,
    evaluator: "codex",
    model: "judge-model",
    name: "correctness",
    reason: "Matches expected",
    score: 1,
    threshold: 1,
  },
  status: "passed",
};

const outcome: TrialOutcome = {
  artifacts: [],
  commandCount: 3,
  exitCode: 0,
  modelMs: 1000,
  sandboxMs: 500,
  status: "passed",
  validations: [judged],
  verifySteps: [],
  voidFields: [],
};

const events: readonly HarnessEvent[] = [
  { _tag: "Started", model: "gpt-5", sessionId: "session_1" },
  { _tag: "Command", command: "bun test", exitCode: 0, output: "ok" },
];

const run = <A, E>(effect: Effect.Effect<A, E, TrialRecorder | Database>) =>
  Effect.runPromise(effect.pipe(Effect.provide(TestLayer)));

const trialRow = (trialInternalId: string) =>
  Database.pipe(
    Effect.flatMap((db) =>
      Effect.promise(() =>
        db
          .select()
          .from(evalTrial)
          .where(eq(evalTrial.internalId, trialInternalId))
      )
    ),
    Effect.map((rows) => rows[0])
  );

const opened = (ordinal: number) =>
  TrialRecorder.pipe(
    Effect.flatMap((recorder) =>
      recorder.open({ ordinal, runInternalId, startedAt: new Date() })
    )
  );

describe.skipIf(skipWithoutDatabase())("TrialRecorder", () => {
  beforeAll(async () => {
    await run(
      Effect.gen(function* () {
        const db = yield* Database;

        yield* Effect.promise(async () => {
          await seedOrganization(db, organizationId);
          await seedRun(db, {
            organizationId,
            tag: `record_${suffix}`,
            trialCount: 5,
          });
        });
      })
    );
  });

  it("shows the journal and validations before the trial settles", async () => {
    const seen = await run(
      Effect.gen(function* () {
        const recorder = yield* TrialRecorder;
        const db = yield* Database;
        const { trialInternalId } = yield* opened(1);

        yield* recorder.append({ events, from: 0, trialInternalId });
        yield* recorder.recordValidations({
          trialInternalId,
          validations: [
            {
              ...validationExecution(
                { id: "code:0", index: 0, kind: "code", name: "check" },
                1000
              ),
              output: validationCapture()({
                message: "Exact evidence",
                passed: true,
              }),
              status: "passed",
            },
          ],
        });

        const midFlight = {
          events: yield* Effect.promise(() =>
            db
              .select()
              .from(evalEvent)
              .where(eq(evalEvent.trialInternalId, trialInternalId))
          ),
          trial: yield* trialRow(trialInternalId),
        };

        yield* recorder.settle({
          finishedAt: new Date(),
          outcome,
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

        return { midFlight, settled: yield* trialRow(trialInternalId) };
      })
    );

    expect(seen.midFlight.events).toHaveLength(2);
    expect(seen.midFlight.trial?.status).toBe("running");
    expect(seen.midFlight.trial?.validations?.[0]?.output.text).toBe(
      '{"message":"Exact evidence","passed":true}'
    );

    expect(seen.settled?.status).toBe("passed");
    expect(seen.settled?.commandCount).toBe(3);
    expect(seen.settled?.sandboxId).toBe("sbx_1");
    expect(seen.settled?.finishedAt).not.toBeNull();
    expect(judgmentsIn(seen.settled?.validations ?? [])).toEqual(
      judgmentsIn([judged])
    );
    expect(seen.settled?.usage).toEqual({
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      inputTokens: 120,
      outputTokens: 40,
      totalTokens: 160,
    });
  });

  it("persists output files, denies other tenants, and clears them on retry", async () => {
    const content = "export const x = 1;";
    const artifact = {
      byteSize: content.length,
      content,
      path: "autumn.config.ts",
      sha256: createHash("sha256").update(content).digest("hex"),
    };

    const seen = await run(
      Effect.gen(function* () {
        const recorder = yield* TrialRecorder;
        const find = yield* trialArtifactQuery;
        const { trialInternalId } = yield* opened(2);

        yield* recorder.settle({
          artifacts: [artifact],
          finishedAt: new Date(),
          outcome,
          sandboxId: null,
          trialInternalId,
          usage: null,
        });

        const request = {
          path: artifact.path,
          sha256: artifact.sha256,
          trialId: trialInternalId,
        };
        const stored = yield* find(organizationId, request);
        const denied = yield* find("another-org", request);
        const metadata = (yield* trialRow(trialInternalId))?.artifacts;

        yield* opened(2);

        return {
          afterRetry: yield* find(organizationId, request),
          denied,
          metadata,
          stored,
        };
      })
    );

    expect(Option.getOrNull(seen.stored)).toEqual(artifact);
    expect(seen.metadata).toEqual([
      {
        byteSize: artifact.byteSize,
        path: artifact.path,
        sha256: artifact.sha256,
      },
    ]);
    expect(Option.isNone(seen.denied)).toBe(true);
    expect(Option.isNone(seen.afterRetry)).toBe(true);
  });

  it("ignores events it has already written", async () => {
    const written = await run(
      Effect.gen(function* () {
        const recorder = yield* TrialRecorder;
        const db = yield* Database;
        const { trialInternalId } = yield* opened(3);

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
        const { trialInternalId } = yield* opened(4);

        yield* recorder.attach({ sandboxId: "sbx-open", trialInternalId });
        yield* recorder.recordValidations({
          trialInternalId,
          validations: [
            {
              ...validationExecution(
                { id: "code:0", index: 0, kind: "code", name: "completed" },
                1000
              ),
              output: validationCapture()(true),
              status: "passed",
            },
            validationExecution(
              { id: "code:1", index: 1, kind: "code", name: "interrupted" },
              1000
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
        yield* recorder.abandon({
          failure: "the sandbox went away",
          finishedAt: new Date(),
          trialInternalId,
        });

        return yield* trialRow(trialInternalId);
      })
    );

    expect(closed?.status).toBe("void");
    expect(closed?.failure).toBe("the sandbox went away");
    expect(closed?.sandboxId).toBeNull();
    expect(closed?.finishedAt).not.toBeNull();
    expect(closed?.validations?.map((record) => record.status)).toEqual([
      "passed",
      "error",
      "skipped",
    ]);
    expect(closed?.validations?.[0]?.output.text).toBe("true");
  });

  it("leaves a settled trial alone when asked to abandon it", async () => {
    const settled = await run(
      Effect.gen(function* () {
        const recorder = yield* TrialRecorder;
        const { trialInternalId } = yield* opened(5);

        yield* recorder.settle({
          finishedAt: new Date(),
          outcome,
          sandboxId: null,
          trialInternalId,
          usage: null,
        });
        yield* recorder.abandon({ finishedAt: new Date(), trialInternalId });

        return yield* trialRow(trialInternalId);
      })
    );

    expect(settled?.status).toBe("passed");
  });

  it("hands the next attempt the sandbox the last one left behind", async () => {
    const seen = await run(
      Effect.gen(function* () {
        const recorder = yield* TrialRecorder;
        const first = yield* opened(6);

        yield* recorder.attach({
          sandboxId: "sbx-left-behind",
          trialInternalId: first.trialInternalId,
        });

        return { first, second: yield* opened(6) };
      })
    );

    expect(Option.isNone(seen.first.priorSandboxId)).toBe(true);
    expect(seen.second.trialInternalId).toBe(seen.first.trialInternalId);
    expect(Option.getOrNull(seen.second.priorSandboxId)).toBe(
      "sbx-left-behind"
    );
  });
});

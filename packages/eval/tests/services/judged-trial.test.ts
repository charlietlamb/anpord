import { expect, test } from "bun:test";
import { EvalValidator } from "@anpord/schema/domain/evals";
import { Effect, Layer, Option, Schema } from "effect";
import { JudgeModel } from "../../src/judges/model";
import {
  AgentTrial,
  type AgentTrialRequest,
  type AgentTrialResult,
} from "../../src/services/agent-trial";
import { AgentTrialJudgedLive } from "../../src/services/judged-trial";
import { emptyEnvCredential } from "../fixtures/credentials";

const request: AgentTrialRequest = {
  organizationId: "test",
  harness: "codex",
  model: "task-model",
  harnessVersion: "test",
  harnessCredential: emptyEnvCredential,
  provider: "e2b",
  autoStopMinutes: 5,
  workspace: "/tmp/task",
  prompt: "Give the answer",
  profile: null,
  prepare: null,
  source: { kind: "empty" },
  verifyCommand: null,
  validator: Schema.decodeUnknownSync(EvalValidator)({
    kind: "judged",
    name: "answer",
    checks: [],
    judges: [
      {
        kind: "judge",
        name: "correctness",
        provider: "openai",
        model: "judge-model",
        rubric: "Matches the expected answer",
        choices: { correct: 1, incorrect: 0 },
        threshold: 1,
      },
    ],
  }),
};

const run = (
  output: string,
  status: "passed" | "failed" | "void" = "passed"
) => {
  const order: string[] = [];
  const base: AgentTrialResult = {
    commands: 0,
    events: [],
    failedCommands: 0,
    filesChanged: [],
    prepared: {},
    sandboxId: "task",
    sessionId: null,
    usage: Option.none(),
    outcome: {
      commandCount: 0,
      exitCode: 0,
      modelMs: 1,
      sandboxMs: 1,
      verifySteps: [],
      voidFields: [],
      status,
      passed: status === "passed",
    },
  };
  const layer = AgentTrialJudgedLive.pipe(
    Layer.provide(
      Layer.mergeAll(
        Layer.succeed(AgentTrial, {
          run: () =>
            Effect.acquireUseRelease(
              Effect.sync(() => order.push("task open")),
              () => Effect.succeed(base),
              () => Effect.sync(() => order.push("task closed"))
            ),
        }),
        Layer.succeed(JudgeModel, {
          complete: (input) =>
            Effect.sync(() => {
              order.push("judge");
              expect(input.judge.model).toBe("judge-model");
              expect(input.input).toBe(request.prompt);
              return output;
            }),
        })
      )
    )
  );
  return Effect.runPromise(
    Effect.gen(function* () {
      const trial = yield* AgentTrial;
      return { result: yield* trial.run(request), order };
    }).pipe(Effect.provide(layer))
  );
};

test("judges after task cleanup and passes at the threshold", async () => {
  const { result, order } = await run(
    '{"choice":"correct","reason":"Correct"}'
  );
  expect(order).toEqual(["task open", "task closed", "judge"]);
  expect(result.outcome.status).toBe("passed");
  expect(result.outcome.judgments?.[0]?.score).toBe(1);
});

test("a passing judge cannot override a failed code check", async () => {
  const { result } = await run(
    '{"choice":"correct","reason":"Correct"}',
    "failed"
  );
  expect(result.outcome.status).toBe("failed");
});

test("a judge below threshold fails the trial", async () => {
  const { result } = await run(
    '{"choice":"incorrect","reason":"Wrong answer"}'
  );
  expect(result.outcome.status).toBe("failed");
});

test("invalid judgment voids the trial", async () => {
  const { result } = await run("invalid");
  expect(result.outcome.status).toBe("void");
  expect(result.outcome.voidFields).toContain("judge:correctness");
});

test("does not judge an already void trial", async () => {
  const { result, order } = await run("invalid", "void");
  expect(result.outcome.status).toBe("void");
  expect(order).not.toContain("judge");
});

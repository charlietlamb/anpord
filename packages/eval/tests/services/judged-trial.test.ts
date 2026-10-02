import { expect, test } from "bun:test";
import { EvalValidator } from "@sphynx/schema/domain/eval-definition";
import type { HarnessEvent } from "@sphynx/schema/domain/harness-event";
import { Effect, Layer, Option, Redacted, Schema } from "effect";
import type { JudgeFile } from "../../src/domain/judge-files";
import { judgmentsIn } from "../../src/domain/judgments";
import { JudgeModel } from "../../src/judges/model";
import { judgeEvidence } from "../../src/judges/prompt";
import { SimulatedUserSilent } from "../../src/ports/simulated-user";
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
        prompt: "Matches the expected answer",
        choices: { correct: 1, incorrect: 0 },
        threshold: 1,
      },
    ],
  }),
};

const run = (
  output: string,
  status: "passed" | "failed" | "void" = "passed",
  conversationEvents: readonly HarnessEvent[] = [],
  asked: AgentTrialRequest = request
) => {
  const order: string[] = [];
  const evidence: string[] = [];
  const base: AgentTrialResult = {
    commands: 0,
    conversationEvents,
    events: [],
    failedCommands: 0,
    filesChanged: [],
    judgeFiles: [],
    prepared: {},
    sandboxId: "task",
    sessionId: null,
    turns: [],
    usage: Option.none(),
    userSpend: Option.none(),
    outcome: {
      artifacts: [],
      commandCount: 0,
      exitCode: 0,
      modelMs: 1,
      sandboxMs: 1,
      validations: [],
      verifySteps: [],
      voidFields: [],
      status,
    },
  };
  const layer = AgentTrialJudgedLive.pipe(
    Layer.provide(SimulatedUserSilent),
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
              expect(input.input).toBe(asked.prompt);
              evidence.push(judgeEvidence(input));
              return { text: output };
            }),
        })
      )
    )
  );
  return Effect.runPromise(
    Effect.gen(function* () {
      const trial = yield* AgentTrial;
      return { evidence, result: yield* trial.run(asked), order };
    }).pipe(Effect.provide(layer))
  );
};

test("judges after task cleanup and passes at the threshold", async () => {
  const { result, order } = await run(
    '{"choice":"correct","reason":"Correct"}'
  );
  expect(order).toEqual(["task open", "task closed", "judge"]);
  expect(result.outcome.status).toBe("passed");
  expect(judgmentsIn(result.outcome.validations)[0]?.score).toBe(1);
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

test("shows the judge what was said and run in each turn", async () => {
  const { evidence } = await run(
    '{"choice":"correct","reason":"Asked first"}',
    "passed",
    [
      {
        _tag: "Message",
        at: 1,
        role: "user",
        text: "Write the pricing config",
      },
      {
        _tag: "Command",
        at: 3,
        command: "cat USER_REQUEST.md",
        exitCode: 0,
        output: "Pro is $20",
        startedAt: 2,
      },
      { _tag: "Message", at: 4, role: "assistant", text: "Which usage limit?" },
      { _tag: "Message", at: 5, role: "user", text: "500 messages" },
      { _tag: "FileChange", at: 6, paths: ["/w/autumn.config.ts"] },
      {
        _tag: "ToolCall",
        at: 7,
        callId: null,
        input: "skills/pricing/SKILL.md",
        name: "read",
        status: "completed",
      },
      { _tag: "Message", at: 8, role: "assistant", text: "Written." },
    ]
  );

  expect(evidence.map((sent) => JSON.parse(sent).conversation)).toEqual([
    [
      { user: "Write the pricing config" },
      { command: "cat USER_REQUEST.md", exitCode: 0, output: "Pro is $20" },
      { agent: "Which usage limit?" },
      { user: "500 messages" },
      { wrote: ["/w/autumn.config.ts"] },
      { tool: "read", input: "skills/pricing/SKILL.md" },
      { agent: "Written." },
    ],
  ]);
});

test("cuts a long command for the judge only after redacting it", async () => {
  const { evidence } = await run(
    '{"choice":"correct","reason":"Fine"}',
    "passed",
    [
      {
        _tag: "Command",
        command: "cat ~/.codex/auth.json",
        exitCode: 0,
        output: `${"o".repeat(3995)}opaque-access-token-1 and am_sk_test_x`,
      },
    ],
    {
      ...request,
      harnessCredential: Redacted.make({
        authMethodId: "api-key",
        connectionId: "conn",
        integrationId: "codex",
        revision: 1,
        values: { apiKey: "opaque-access-token-1" },
      }),
    }
  );

  expect(JSON.parse(evidence[0] ?? "{}").conversation).toEqual([
    {
      command: "cat ~/.codex/auth.json",
      exitCode: 0,
      output: `${"o".repeat(3995)}[reda [truncated]`,
    },
  ]);
});

const withFiles = (judgeFiles: readonly JudgeFile[]) => {
  const sent: string[] = [];
  const asked: AgentTrialRequest = {
    ...request,
    harnessCredential: Redacted.make({
      authMethodId: "api-key",
      connectionId: "conn",
      integrationId: "codex",
      revision: 1,
      values: { apiKey: "opaque-access-token-1" },
    }),
    validator: Schema.decodeUnknownSync(EvalValidator)({
      kind: "judged",
      name: "post",
      checks: [],
      judges: [
        {
          kind: "judge",
          name: "post quality",
          provider: "openai",
          model: "judge-model",
          prompt: "The post is clear",
          choices: { clear: 1, unclear: 0 },
          files: ["out/post.md"],
        },
      ],
    }),
  };
  const result: AgentTrialResult = {
    commands: 0,
    conversationEvents: [],
    events: [],
    failedCommands: 0,
    filesChanged: [],
    judgeFiles,
    prepared: {},
    sandboxId: "task",
    sessionId: null,
    turns: [],
    usage: Option.none(),
    userSpend: Option.none(),
    outcome: {
      artifacts: [],
      commandCount: 0,
      exitCode: 0,
      modelMs: 1,
      sandboxMs: 1,
      validations: [],
      verifySteps: [],
      voidFields: [],
      status: "passed",
    },
  };
  const layer = AgentTrialJudgedLive.pipe(
    Layer.provide(
      Layer.mergeAll(
        Layer.succeed(AgentTrial, { run: () => Effect.succeed(result) }),
        Layer.succeed(JudgeModel, {
          complete: (input) =>
            Effect.sync(() => {
              sent.push(judgeEvidence(input));
              return { text: '{"choice":"clear","reason":"Clear"}' };
            }),
        })
      )
    )
  );
  return Effect.runPromise(
    AgentTrial.pipe(
      Effect.flatMap((trial) => trial.run(asked)),
      Effect.map((judged) => ({ judged, sent })),
      Effect.provide(layer)
    )
  );
};

test("a judge reads the full text of each workspace file it names", async () => {
  const post = `${"p".repeat(19_989)}end of post`;
  const { judged, sent } = await withFiles([
    { kind: "read", path: "out/post.md", text: post },
  ]);

  const files = JSON.parse(sent[0] ?? "{}").files;
  expect(files.map(({ path }: { path: string }) => path)).toEqual([
    "out/post.md",
  ]);
  expect(files[0].text).toHaveLength(20_000);
  expect(files[0].text.slice(-11)).toBe("end of post");
  expect(judged.outcome.status).toBe("passed");
});

test("a missing judge file voids the trial without asking the judge", async () => {
  const { judged, sent } = await withFiles([
    { kind: "missing", path: "out/post.md" },
  ]);

  expect(sent).toEqual([]);
  expect(judged.outcome.status).toBe("void");
  expect(judged.outcome.voidFields).toEqual(["judge:post quality"]);
  expect(judgmentsIn(judged.outcome.validations)[0]?.error).toBe(
    "Judge file out/post.md was not in the workspace when the trial finished"
  );
});

test("an oversized judge file voids the trial and names the limit", async () => {
  const { judged, sent } = await withFiles([
    { kind: "oversized", path: "out/post.md", limit: "file" },
  ]);

  expect(sent).toEqual([]);
  expect(judged.outcome.status).toBe("void");
  expect(judgmentsIn(judged.outcome.validations)[0]?.error).toBe(
    "Judge file out/post.md is over the 32,000 character limit"
  );
});

test("redacts secrets in a judge file before the judge reads it", async () => {
  const { sent } = await withFiles([
    {
      kind: "read",
      path: "out/post.md",
      text: "token opaque-access-token-1 and key am_sk_live_abc in the post",
    },
  ]);

  expect(JSON.parse(sent[0] ?? "{}").files).toEqual([
    {
      path: "out/post.md",
      text: "token [redacted] and key [redacted] in the post",
    },
  ]);
});

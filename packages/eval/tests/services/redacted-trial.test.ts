import { expect, test } from "bun:test";
import {
  type EvalValidation,
  validationCapture,
  validationExecution,
} from "@anpord/schema/domain/eval-validations";
import type { HarnessEvent } from "@anpord/schema/domain/harness-event";
import { Effect, Layer, Option, Redacted } from "effect";
import {
  AgentTrial,
  type AgentTrialRequest,
  type AgentTrialResult,
} from "../../src/services/agent-trial";
import { AgentTrialRedactedLive } from "../../src/services/redacted-trial";

const AUTH_JSON = JSON.stringify({
  tokens: {
    access_token: "opaque-access-token-1",
    refresh_token: "rt.opaque.2",
  },
});

const request: AgentTrialRequest = {
  autoStopMinutes: 5,
  harness: "codex",
  harnessCredential: Redacted.make({
    authMethodId: "auth-json",
    connectionId: "conn",
    integrationId: "codex",
    revision: 1,
    values: { authJson: AUTH_JSON },
  }),
  harnessVersion: "test",
  model: "task-model",
  organizationId: "test",
  prepare: null,
  profile: null,
  prompt: "Do it",
  provider: "e2b",
  source: { kind: "empty" },
  verifyCommand: null,
  workspace: "/tmp/task",
};

const printedAuth: EvalValidation = {
  ...validationExecution(
    { id: "code:0", index: 0, kind: "code", name: "check" },
    0
  ),
  calls: [
    {
      durationMs: 1,
      error: null,
      index: 0,
      input: validationCapture()(["cat ~/.codex/auth.json"]),
      method: "exec",
      output: validationCapture()({ stdout: AUTH_JSON }),
      startedAt: 0,
    },
  ],
  logs: [
    {
      at: 0,
      index: 0,
      level: "stdout",
      value: validationCapture()(
        "access opaque-access-token-1, refresh rt.opaque.2",
        "text"
      ),
    },
  ],
  status: "passed",
};

const result: AgentTrialResult = {
  commands: 0,
  conversationEvents: [],
  events: [],
  failedCommands: 0,
  filesChanged: [],
  judgeFiles: [],
  outcome: {
    artifacts: [],
    commandCount: 0,
    exitCode: 0,
    modelMs: 1,
    sandboxMs: 1,
    status: "passed",
    validations: [printedAuth],
    verifySteps: [],
    voidFields: [],
  },
  prepared: {},
  sandboxId: "task",
  sessionId: null,
  turns: [],
  userSpend: Option.none(),
  usage: Option.none(),
};

test("a validator that prints the harness credential stores none of it, live or settled", async () => {
  const observed: EvalValidation[] = [];
  const inner = Layer.succeed(AgentTrial, {
    run: (asked) =>
      Effect.as(asked.onValidation?.(printedAuth) ?? Effect.void, result),
  });

  const settled = await Effect.runPromise(
    Effect.flatMap(AgentTrial, (trial) =>
      trial.run({
        ...request,
        onValidation: (record) =>
          Effect.sync(() => {
            observed.push(record);
          }),
      })
    ).pipe(Effect.provide(AgentTrialRedactedLive.pipe(Layer.provide(inner))))
  );

  expect(
    [observed[0], settled.outcome.validations?.[0]].map((record) => [
      record?.calls[0]?.output.text,
      record?.logs[0]?.value.text,
    ])
  ).toEqual([
    ['{"stdout":"[redacted]"}', "access [redacted], refresh [redacted]"],
    ['{"stdout":"[redacted]"}', "access [redacted], refresh [redacted]"],
  ]);
});

test("the agent's journal is redacted as it streams and in the settled trial", async () => {
  const journal: readonly HarnessEvent[] = [
    {
      _tag: "Command",
      command: "cat ~/.codex/auth.json; echo $STRIPE",
      exitCode: 0,
      output:
        "access opaque-access-token-1\nSTRIPE=sk_live_51HqLyjWDarjtT1zdp7dc",
    },
    {
      _tag: "ToolCall",
      callId: null,
      input: '{"token":"rt.opaque.2"}',
      name: "fetch",
      output: "used am_sk_test_x",
      status: "ok",
    },
    {
      _tag: "Message",
      role: "assistant",
      text: "Done with opaque-access-token-1",
    },
  ];
  const streamed: HarnessEvent[] = [];
  const inner = Layer.succeed(AgentTrial, {
    run: (asked) =>
      Effect.as(
        Effect.orDie(asked.progress?.append(journal, 0) ?? Effect.void),
        { ...result, events: journal }
      ),
  });

  const settled = await Effect.runPromise(
    Effect.flatMap(AgentTrial, (trial) =>
      trial.run({
        ...request,
        progress: {
          append: (events) =>
            Effect.sync(() => {
              streamed.push(...events);
            }),
        },
      })
    ).pipe(Effect.provide(AgentTrialRedactedLive.pipe(Layer.provide(inner))))
  );

  const expected: readonly HarnessEvent[] = [
    {
      _tag: "Command",
      command: "cat ~/.codex/auth.json; echo $STRIPE",
      exitCode: 0,
      output: "access [redacted]\nSTRIPE=[redacted]",
    },
    {
      _tag: "ToolCall",
      callId: null,
      input: '{"token":"[redacted]"}',
      name: "fetch",
      output: "used [redacted]",
      status: "ok",
    },
    { _tag: "Message", role: "assistant", text: "Done with [redacted]" },
  ];
  expect([streamed, settled.events]).toEqual([expected, expected]);
});

test("forwarded and sandbox secrets the agent prints are redacted, and plain addresses stay readable", async () => {
  const journal: readonly HarnessEvent[] = [
    {
      _tag: "Command",
      command: "env",
      exitCode: 0,
      output: [
        "STRIPE_KEY=stripe9Tq2Lw8Zr4Vb6Nc1",
        "SESSION_SECRET=correct horse battery",
        "DATABASE_URL=postgres://app:Wq9vLr2xT7@db.internal:5432/app",
        "PGPASSWORD=Wq9vLr2xT7",
        "API_BASE=http://localhost:3000/v1",
        "NODE_ENV=production",
        "CLOUDFLARE_API_TOKEN=cf5f1c0e9a7b3d2c4e6f8a",
        "SANDBOX_URL=https://sandbox.acme.workers.dev",
      ].join("\n"),
    },
  ];
  const inner = Layer.succeed(AgentTrial, {
    run: () => Effect.succeed({ ...result, events: journal }),
  });

  const settled = await Effect.runPromise(
    Effect.flatMap(AgentTrial, (trial) =>
      trial.run({
        ...request,
        forwarded: {
          API_BASE: "http://localhost:3000/v1",
          DATABASE_URL: "postgres://app:Wq9vLr2xT7@db.internal:5432/app",
          NODE_ENV: "production",
          SESSION_SECRET: "correct horse battery",
          STRIPE_KEY: "stripe9Tq2Lw8Zr4Vb6Nc1",
        },
        sandboxCredentials: Redacted.make({
          apiToken: "cf5f1c0e9a7b3d2c4e6f8a",
          sandboxUrl: "https://sandbox.acme.workers.dev",
        }),
      })
    ).pipe(Effect.provide(AgentTrialRedactedLive.pipe(Layer.provide(inner))))
  );

  expect(
    settled.events.map((event) =>
      event._tag === "Command" ? event.output : null
    )
  ).toEqual([
    [
      "STRIPE_KEY=[redacted]",
      "SESSION_SECRET=[redacted]",
      "DATABASE_URL=postgres://app:[redacted]@db.internal:5432/app",
      "PGPASSWORD=[redacted]",
      "API_BASE=http://localhost:3000/v1",
      "NODE_ENV=production",
      "CLOUDFLARE_API_TOKEN=[redacted]",
      "SANDBOX_URL=https://sandbox.acme.workers.dev",
    ].join("\n"),
  ]);
});

import { describe, expect, it } from "bun:test";
import { StartBatchRequest } from "@sphynx/schema/domain/eval-definition";
import { Effect, Schema } from "effect";
import { runLocally } from "../../src/cli/eval-local";
import { localUsage } from "../../src/cli/eval-usage";

const request = Schema.decodeUnknownSync(StartBatchRequest)({
  cases: [
    {
      id: "fixture",
      variables: { task: "say hi" },
      verify: 'test "$(cat prompt-seen.txt)" = "say hi"',
    },
  ],
  suite: { id: "smoke", prompt: "{{task}}" },
  trials: 1,
  variants: [
    {
      harness: "command",
      model: "none",
      profile: {
        files: {},
        name: "echoes-the-prompt",
        run: 'printf %s "$SPHYNX_PROMPT" > prompt-seen.txt',
      },
    },
  ],
});

describe("what a local run sends the agent", () => {
  it("renders the suite prompt against the case's variables", async () => {
    const results = await Effect.runPromise(runLocally(request));

    expect(results).toHaveLength(1);
    expect(results[0]?.status).toBe("passed");
  }, 180_000);
});

const mixed = Schema.decodeUnknownSync(StartBatchRequest)({
  cases: [
    {
      id: "setup-breaks",
      prepare: { name: "seeds-data", source: "process.exit(3);" },
      variables: { task: "touch done.txt" },
      verify: "test -f done.txt",
    },
    {
      id: "runs-long",
      timeoutMs: 1000,
      variables: { task: "sleep 20" },
      verify: "true",
    },
    {
      id: "writes-done",
      variables: { task: "touch done.txt" },
      verify: "test -f done.txt",
    },
  ],
  suite: { id: "mixed", prompt: "{{task}}" },
  trials: 1,
  variants: [
    {
      harness: "command",
      model: "none",
      profile: { files: {}, name: "obeys", run: 'eval "$SPHYNX_PROMPT"' },
    },
  ],
});

describe("a local run where some trials cannot finish", () => {
  it("records each trial's own outcome and runs every case", async () => {
    const results = await Effect.runPromise(runLocally(mixed));

    expect(results.map((one) => [one.name, one.status])).toEqual([
      ["setup-breaks", "void"],
      ["runs-long", "timed out"],
      ["writes-done", "passed"],
    ]);
    expect(results[1]?.reason).toBe("The agent ran past its time limit of 1s");
    expect(results[0]?.reason).toBe(
      "The prepare step seeds-data exited with status 3"
    );
  }, 180_000);
});

const reportsUsage = Schema.decodeUnknownSync(StartBatchRequest)({
  cases: [{ id: "reads-a-lot", variables: { task: "go" }, verify: "true" }],
  suite: { id: "usage", prompt: "{{task}}" },
  trials: 1,
  variants: [
    {
      harness: "command",
      model: "none",
      profile: {
        files: {},
        name: "five-commands-one-turn",
        run: [
          ...["a", "b", "c", "d", "e"].map(
            (name) =>
              `echo '{"_tag":"Command","command":"step ${name}","exitCode":0,"output":""}'`
          ),
          `echo '{"_tag":"Usage","inputTokens":30000,"outputTokens":1000,"cacheReadTokens":0}'`,
        ].join("; "),
      },
    },
  ],
});

describe("the usage a local run reports", () => {
  it("weighs context by the commands the agent ran, as a hosted run does", async () => {
    const results = await Effect.runPromise(runLocally(reportsUsage));

    expect(localUsage(results).lines).toEqual(["31k tokens (30k in, 1k out)"]);
  }, 180_000);
});

const personOnAnotherHarness = Schema.decodeUnknownSync(StartBatchRequest)({
  cases: [
    {
      id: "asks-first",
      user: {
        goal: "Get it done",
        kind: "simulated",
        harness: "codex",
        model: "gpt-5.6-luna",
        prompt: "Say yes.",
      },
      variables: { task: "true" },
      verify: "true",
    },
  ],
  suite: { id: "leases", prompt: "{{task}}" },
  trials: 1,
  variants: [
    {
      harness: "command",
      model: "none",
      profile: {
        files: {},
        name: "starts-a-session",
        run: `echo '{"_tag":"Started","model":"none","sessionId":"s1"}'`,
      },
    },
  ],
});

describe("credentials a local run leased", () => {
  it("answers the person's harness from the leases, not this machine", async () => {
    const results = await Effect.runPromise(
      runLocally(personOnAnotherHarness, {
        credentials: new Map([["claude", { ANTHROPIC_API_KEY: "leased" }]]),
      })
    );

    expect(results.map((one) => [one.status, one.reason])).toEqual([
      ["void", "no codex connection is configured for this organization"],
    ]);
  }, 180_000);
});

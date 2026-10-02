import { describe, expect, it } from "bun:test";
import {
  type EvalPrepare,
  EvalValidator,
} from "@sphynx/schema/domain/eval-definition";
import type { HarnessEvent } from "@sphynx/schema/domain/harness-event";
import { ConfigProvider, Effect, Schema } from "effect";
import { judgmentsIn } from "../../src/domain/judgments";
import { EvalLocalLive } from "../../src/local-layer";
import { LocalTrials } from "../../src/services/local-trial";

/* The point of the local provider: no database, no grid, no cloud credential.
   If this needs any of them, it is not a local run. */
const opted = ConfigProvider.fromMap(
  new Map([["SPHYNX_LOCAL_SANDBOX", "true"]])
).pipe(ConfigProvider.orElse(() => ConfigProvider.fromEnv()));

const runCase = (
  verify: string,
  files: Readonly<Record<string, string>> = {},
  forwarded: Readonly<Record<string, string>> = {},
  prepare: EvalPrepare | null = null
) =>
  LocalTrials.pipe(
    Effect.flatMap((trials) =>
      trials.run({
        caseName: "a local case",
        forwarded,
        harness: "command",
        harnessVersion: "1",
        model: "none",
        prepare,
        /* The command harness is the agent here: what it "does" is the run
           command, so a trial needs no model and no model credential. */
        profile: {
          env: null,
          files: {},
          install: null,
          name: "noop",
          run: "printf 'done'",
          systemPrompt: null,
        },
        prompt: "do nothing",
        source: { files, kind: "files" },
        verifyCommand: verify,
      })
    ),
    Effect.provide(EvalLocalLive),
    Effect.scoped,
    Effect.withConfigProvider(opted),
    Effect.runPromise
  );

describe("a trial that runs on this machine", () => {
  it("passes when the verifier agrees, with no database anywhere", async () => {
    const outcome = await runCase("test -f given.txt", { "given.txt": "here" });

    expect(outcome.outcome.status).toBe("passed");
    expect(outcome.outcome.exitCode).toBe(0);
  }, 180_000);

  it("fails when the verifier disagrees", async () => {
    const outcome = await runCase("test -f missing.txt", {
      "given.txt": "here",
    });

    expect(outcome.outcome.status).toBe("failed");
    expect(outcome.outcome.exitCode).not.toBe(0);
  }, 180_000);

  it("reports how long it took", async () => {
    const outcome = await runCase("true");

    expect(outcome.durationMs).toBeGreaterThan(0);
  }, 180_000);

  /* The reason the provider exists: a cloud sandbox cannot see a service on
     the machine the developer is changing. */
  it("verifies against a service running on this machine", async () => {
    const server = Bun.serve({ fetch: () => new Response("ready"), port: 0 });

    try {
      const outcome = await runCase(
        `test "$(curl -s http://localhost:${server.port})" = ready`
      );

      expect(outcome.outcome.status).toBe("passed");
    } finally {
      server.stop(true);
    }
  }, 180_000);

  /* A verifier that cannot read what the agent was pointed at can only check
     the service by accident. */
  it("gives the verifier the variables the run forwarded", async () => {
    const server = Bun.serve({ fetch: () => new Response("ready"), port: 0 });

    try {
      const outcome = await runCase(
        'test "$(curl -s $SPHYNX_TEST_BASE)" = ready',
        {},
        { SPHYNX_TEST_BASE: `http://localhost:${server.port}` }
      );

      expect(outcome.outcome.status).toBe("passed");
    } finally {
      server.stop(true);
    }
  }, 180_000);

  it("gives the prepare step the variables the run forwarded", async () => {
    const outcome = await runCase(
      "true",
      {},
      { SPHYNX_TEST_PREPARE: "prepared-value" },
      {
        name: "reads what was forwarded",
        source:
          'console.log("SPHYNX_PREPARE_RESULT=" + JSON.stringify({ seen: process.env.SPHYNX_TEST_PREPARE ?? null }));',
      }
    );

    expect(outcome.result.prepared).toEqual({ seen: "prepared-value" });
  }, 180_000);

  it("withholds a variable the run did not name", async () => {
    process.env.SPHYNX_TEST_SECRET = "leaked";

    try {
      const outcome = await runCase('test -z "$SPHYNX_TEST_SECRET"');

      expect(outcome.outcome.status).toBe("passed");
    } finally {
      process.env.SPHYNX_TEST_SECRET = undefined;
    }
  }, 180_000);
});

describe("what a local trial is given", () => {
  it("seeds the workspace from the case's source", async () => {
    const outcome = await runCase("test -f AGENTS.md && test -f package.json", {
      "AGENTS.md": "# seeded",
      "package.json": "{}",
    });

    expect(outcome.outcome.status).toBe("passed");
  }, 180_000);
});

describe("what a local trial shows and reports", () => {
  it("redacts a key the agent prints, in the live journal and the report", async () => {
    const streamed: HarnessEvent[] = [];
    const outcome = await LocalTrials.pipe(
      Effect.flatMap((trials) =>
        trials.run({
          caseName: "prints a key",
          harness: "command",
          harnessVersion: "1",
          model: "none",
          onProgress: (events) =>
            Effect.sync(() => {
              streamed.push(...events);
            }),
          prepare: null,
          profile: {
            env: null,
            files: {},
            install: null,
            name: "leaky",
            run: "printf 'created am_sk_test_abc123 for the app'",
            systemPrompt: null,
          },
          prompt: "make a key",
          source: { files: {}, kind: "files" },
          verifyCommand: "true",
        })
      ),
      Effect.provide(EvalLocalLive),
      Effect.scoped,
      Effect.withConfigProvider(opted),
      Effect.runPromise
    );

    const said = (events: readonly HarnessEvent[]) =>
      JSON.stringify(events).match(/created \S+ for the app/g);

    expect([said(streamed), said(outcome.events)]).toEqual([
      ["created [redacted] for the app"],
      ["created [redacted] for the app"],
    ]);
  }, 180_000);
});

describe("what a local judge reads", () => {
  it("captures the files the agent wrote and voids on a missing or oversized one", async () => {
    const judge = (name: string, files: readonly string[]) => ({
      kind: "judge",
      name,
      provider: "openai",
      model: "judge-model",
      prompt: "The post is clear",
      choices: { clear: 1, unclear: 0 },
      files,
    });
    const outcome = await LocalTrials.pipe(
      Effect.flatMap((trials) =>
        trials.run({
          caseName: "writes a post",
          harness: "command",
          harnessVersion: "1",
          model: "none",
          prepare: null,
          profile: {
            env: null,
            files: {},
            install: null,
            name: "writer",
            run: "mkdir -p out && head -c 19989 /dev/zero | tr '\\0' p > out/post.md && printf 'end of post' >> out/post.md && head -c 32001 /dev/zero | tr '\\0' b > big.md",
            systemPrompt: null,
          },
          prompt: "write a post",
          source: { files: {}, kind: "files" },
          validator: Schema.decodeUnknownSync(EvalValidator)({
            kind: "judged",
            name: "post",
            checks: [],
            judges: [
              judge("grounded", ["out/post.md", "out/missing.md"]),
              judge("short", ["big.md"]),
            ],
          }),
          verifyCommand: null,
        })
      ),
      Effect.provide(EvalLocalLive),
      Effect.scoped,
      Effect.withConfigProvider(opted),
      Effect.runPromise
    );

    const [post, missing, big] = outcome.result.judgeFiles;
    expect(post?.kind === "read" ? post.text.length : null).toBe(20_000);
    expect(post?.kind === "read" ? post.text.slice(-11) : null).toBe(
      "end of post"
    );
    expect([missing, big]).toEqual([
      { kind: "missing", path: "out/missing.md" },
      { kind: "oversized", path: "big.md", limit: "file" },
    ]);
    expect(outcome.outcome.status).toBe("void");
    expect(
      judgmentsIn(outcome.outcome.validations).map(({ error }) => error)
    ).toEqual([
      "Judge file out/missing.md was not in the workspace when the trial finished",
      "Judge file big.md is over the 32,000 character limit",
    ]);
  }, 180_000);
});

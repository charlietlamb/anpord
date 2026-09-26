import { describe, expect, it } from "bun:test";
import type { EvalPrepare } from "@anpord/schema/domain/eval-definition";
import type { HarnessEvent } from "@anpord/schema/domain/harness-event";
import { ConfigProvider, Effect } from "effect";
import { EvalLocalLive } from "../../src/local-layer";
import { LocalTrials } from "../../src/services/local-trial";

/* The point of the local provider: no database, no grid, no cloud credential.
   If this needs any of them, it is not a local run. */
const opted = ConfigProvider.fromMap(
  new Map([["ANPORD_LOCAL_SANDBOX", "true"]])
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
        'test "$(curl -s $ANPORD_TEST_BASE)" = ready',
        {},
        { ANPORD_TEST_BASE: `http://localhost:${server.port}` }
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
      { ANPORD_TEST_PREPARE: "prepared-value" },
      {
        name: "reads what was forwarded",
        source:
          'console.log("ANPORD_PREPARE_RESULT=" + JSON.stringify({ seen: process.env.ANPORD_TEST_PREPARE ?? null }));',
      }
    );

    expect(outcome.result.prepared).toEqual({ seen: "prepared-value" });
  }, 180_000);

  it("withholds a variable the run did not name", async () => {
    process.env.ANPORD_TEST_SECRET = "leaked";

    try {
      const outcome = await runCase('test -z "$ANPORD_TEST_SECRET"');

      expect(outcome.outcome.status).toBe("passed");
    } finally {
      process.env.ANPORD_TEST_SECRET = undefined;
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

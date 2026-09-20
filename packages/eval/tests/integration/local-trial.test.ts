import { describe, expect, it } from "bun:test";
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
  forwardEnv: readonly string[] = []
) =>
  LocalTrials.pipe(
    Effect.flatMap((trials) =>
      trials.run({
        caseName: "a local case",
        forwardEnv,
        harness: "command",
        harnessVersion: "1",
        model: "none",
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

    process.env.ANPORD_TEST_BASE = `http://localhost:${server.port}`;

    try {
      const outcome = await runCase(
        'test "$(curl -s $ANPORD_TEST_BASE)" = ready',
        {},
        ["ANPORD_TEST_BASE"]
      );

      expect(outcome.outcome.status).toBe("passed");
    } finally {
      server.stop(true);
      process.env.ANPORD_TEST_BASE = undefined;
    }
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

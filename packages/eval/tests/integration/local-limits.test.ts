import { describe, expect, it } from "bun:test";
import { ConfigProvider, Effect, Either } from "effect";
import { EvalLocalLive } from "../../src/local-layer";
import { LocalTrials } from "../../src/services/local-trial";

const opted = ConfigProvider.fromMap(
  new Map([["ANPORD_LOCAL_SANDBOX", "true"]])
).pipe(ConfigProvider.orElse(() => ConfigProvider.fromEnv()));

const agentTaking = (milliseconds: number) => `
const say = (line) => console.log(JSON.stringify(line));
say({ _tag: "Started", model: "none", sessionId: "s-1" });
Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ${milliseconds});
say({ _tag: "Message", role: "assistant", text: "Done." });
`;

const runLimited = (input: {
  readonly maxTurns?: number;
  readonly timeoutMs?: number;
  readonly turnMs: number;
}) =>
  LocalTrials.pipe(
    Effect.flatMap((trials) =>
      trials.run({
        caseName: "a limited case",
        harness: "command",
        harnessVersion: "1",
        maxTurns: input.maxTurns ?? null,
        model: "none",
        profile: {
          env: null,
          files: {},
          install: null,
          name: "slow",
          run: "node agent.cjs",
          systemPrompt: null,
        },
        prompt: "start",
        source: {
          files: { "agent.cjs": agentTaking(input.turnMs) },
          kind: "files",
        },
        timeoutMs: input.timeoutMs ?? null,
        user: {
          kind: "scripted",
          replies: ["one", "two", "three", "four", "five"],
        },
        verifyCommand: "true",
      })
    ),
    Effect.provide(EvalLocalLive),
    Effect.scoped,
    Effect.withConfigProvider(opted),
    Effect.either,
    Effect.runPromise
  );

describe("the limits a case sets", () => {
  it("stops the conversation at the case's turn limit", async () => {
    const result = await runLimited({ maxTurns: 2, turnMs: 0 });

    expect(
      Either.map(result, ({ outcome, result: trial }) => ({
        status: outcome.status,
        userTexts: trial.turns.map((turn) => turn.userText),
      }))
    ).toEqual(Either.right({ status: "passed", userTexts: ["start", "one"] }));
  }, 60_000);

  it("times the trial out once its turns together pass the limit", async () => {
    const result = await runLimited({ timeoutMs: 2000, turnMs: 800 });

    expect(
      Either.flip(result).pipe(Either.map((error) => error.message))
    ).toEqual(Either.right("The agent ran past its time limit of 2s"));
  }, 60_000);

  it("ends a turn that hangs when the limit runs out", async () => {
    const started = performance.now();
    const result = await runLimited({ timeoutMs: 1000, turnMs: 60_000 });

    expect(Either.flip(result).pipe(Either.map((error) => error._tag))).toEqual(
      Either.right("TrialTimedOut")
    );
    expect(performance.now() - started).toBeLessThan(30_000);
  }, 60_000);
});

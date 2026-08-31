import { describe, expect, it } from "bun:test";
import { Effect, Layer } from "effect";
import { HarnessesLive } from "../../src/adapters/harness/resolve";
import { ScorerGroundTruthLive } from "../../src/adapters/scorers/ground-truth";
import { EvalSandboxLive } from "../../src/layer";
import { AgentTrial, AgentTrialLive } from "../../src/services/agent-trial";
import { codexCredential, hasCodex, hasDaytona } from "../fixtures/credentials";

const READY = hasDaytona && hasCodex;

/* Long enough that a measured duration cannot be mistaken for the gap to the
   next event, which is what a journal without paired lines would report. */
const SLEEP_SECONDS = 5;

const TestLayer = AgentTrialLive.pipe(
  Layer.provide(HarnessesLive),
  Layer.provide(ScorerGroundTruthLive),
  Layer.provideMerge(EvalSandboxLive)
);

const trial = Effect.gen(function* () {
  const agent = yield* AgentTrial;

  return yield* agent.run({
    autoStopMinutes: 15,
    harness: "codex",
    harnessCredential: codexCredential,
    harnessVersion: "0.144.4",
    model: "gpt-5.2",
    prompt: `Run exactly one shell command: \`sleep ${SLEEP_SECONDS} && echo done\`. Then stop without running anything else.`,
    provider: "daytona",
    setup: null,
    source: { kind: "files", files: { "note.txt": "nothing to fix" } },
    verifyCommand: null,
    workspace: "/tmp/anpord-timing",
  });
});

describe.if(READY)("a journal timed against a real harness", () => {
  /** The proof of the whole chain. A duration that matches a known sleep is
   * the only thing showing these timestamps are measured at the moment each
   * line arrives rather than stamped when the row is written, which is the
   * bug that gave every event in a trial one identical moment. */
  it("measures a command against the clock, not against the next event", async () => {
    const result = await Effect.runPromise(
      trial.pipe(Effect.provide(TestLayer))
    );

    const sleep = result.events.find(
      (event) => event._tag === "Command" && event.command.includes("sleep")
    );

    if (sleep?._tag !== "Command") {
      throw new Error("expected the agent to have run the sleep");
    }

    expect(sleep.startedAt).toBeDefined();
    expect(sleep.at).toBeDefined();

    const measured = (sleep.at ?? 0) - (sleep.startedAt ?? 0);

    expect(measured).toBeGreaterThanOrEqual(SLEEP_SECONDS * 1000);
    expect(measured).toBeLessThan((SLEEP_SECONDS + 5) * 1000);

    /* A journal that collapses to one moment is the regression this
         replaces, so distinctness is asserted rather than assumed. */
    const moments = new Set(result.events.map((event) => event.at));

    expect(moments.size).toBeGreaterThan(1);
  }, 900_000);
});

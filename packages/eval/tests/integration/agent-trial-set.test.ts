import { describe, expect, it } from "bun:test";
import { Effect, Layer, Redacted } from "effect";
import { CodexRunnerLive } from "../../src/harness/codex";
import { EvalSandboxLive } from "../../src/layer";
import { ScorerGroundTruthLive } from "../../src/scoring/ground-truth";
import { AgentTrial, AgentTrialLive } from "../../src/services/agent-trial";
import { runAgentTrialSet } from "../../src/services/agent-trial-set";
import {
  AGENT_PROMPT,
  brokenFiles,
  SETUP_COMMAND,
  VERIFY_COMMAND,
} from "../fixtures/broken-task";
import {
  codexCredentials,
  hasCodex,
  hasDaytona,
} from "../fixtures/credentials";

const READY = hasDaytona && hasCodex;

const TestLayer = AgentTrialLive.pipe(
  Layer.provide(CodexRunnerLive),
  Layer.provide(ScorerGroundTruthLive),
  Layer.provideMerge(EvalSandboxLive)
);

describe.if(READY)("a set of agent trials", () => {
  /* The claim the product rests on: one agent run is not repeatable, so the
     reportable unit is a rate over N with the spread beside it. */
  it("reports a distribution over several agent runs", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const trial = yield* AgentTrial;
        return yield* runAgentTrialSet(trial, {
          autoStopMinutes: 15,
          concurrency: 3,
          credentials: codexCredentials ?? Redacted.make(""),
          files: brokenFiles,
          harness: "codex",
          harnessVersion: "0.144.4",
          home: "/home/daytona",
          model: "gpt-5.2",
          prompt: AGENT_PROMPT,
          provider: "daytona",
          setupCommand: SETUP_COMMAND,
          trials: 3,
          verifyCommand: VERIFY_COMMAND,
          workspace: "/tmp/anpord-task",
        });
      }).pipe(Effect.provide(TestLayer))
    );

    expect(result.outcomes).toHaveLength(3);
    expect(result.distribution.trials).toBe(3);
    expect(result.distribution.voided).toBe(0);
    expect(result.distribution.passRate).toBeGreaterThan(0);

    /* Every trial gets its own sandbox. State carried between them would
         invalidate the comparison without anything reporting it. */
    expect(new Set(result.sandboxIds).size).toBe(3);

    expect(result.commandSpread).toHaveLength(3);
    for (const commands of result.commandSpread) {
      expect(commands).toBeGreaterThan(0);
    }
  }, 1_200_000);
});

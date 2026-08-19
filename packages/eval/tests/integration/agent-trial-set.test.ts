import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { Effect, Layer } from "effect";
import { CodexRunnerLive } from "../../src/harness/codex";
import { EvalSandboxLive } from "../../src/layer";
import { ScorerGroundTruthLive } from "../../src/scoring/ground-truth";
import { AgentTrialLive } from "../../src/services/agent-trial";
import {
  AgentTrialSet,
  AgentTrialSetLive,
} from "../../src/services/agent-trial-set";
import {
  AGENT_PROMPT,
  brokenFiles,
  SETUP_COMMAND,
  VERIFY_COMMAND,
} from "../fixtures/broken-task";

const SCRATCH =
  "/private/tmp/claude-501/-Users-charlielamb-Documents-anpord/12b411dd-d640-4169-a77f-0b9be144cdbd/scratchpad";

const read = (path: string) => {
  try {
    return readFileSync(path, "utf8").trim();
  } catch {
    return;
  }
};

process.env.DAYTONA_API_KEY ??= read(`${SCRATCH}/daytona.key`);
const CREDENTIALS = read(`${homedir()}/.codex/auth.json`);
const READY = Boolean(process.env.DAYTONA_API_KEY && CREDENTIALS);

const TestLayer = AgentTrialSetLive.pipe(
  Layer.provide(AgentTrialLive),
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
        const set = yield* AgentTrialSet;
        return yield* set.run({
          autoStopMinutes: 15,
          concurrency: 3,
          credentials: CREDENTIALS ?? "",
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

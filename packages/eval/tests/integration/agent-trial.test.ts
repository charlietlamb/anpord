import { describe, expect, it } from "bun:test";
import { Effect, Layer, Option } from "effect";
import { HarnessesLive } from "../../src/adapters/harness/resolve";
import { ScorerGroundTruthLive } from "../../src/adapters/scorers/ground-truth";
import { EvalSandboxLive } from "../../src/layer";
import { AgentTrial, AgentTrialLive } from "../../src/services/agent-trial";
import { SuspenderSleeping } from "../../src/services/resumable-command";
import {
  AGENT_PROMPT,
  brokenSource,
  VERIFY_COMMAND,
} from "../fixtures/broken-task";
import {
  codexCredential,
  hasCloudflare,
  hasCodex,
  hasDaytona,
  hasModal,
  hasUpstash,
  hasVercel,
} from "../fixtures/credentials";

const TestLayer = AgentTrialLive.pipe(
  Layer.provide(HarnessesLive),
  Layer.provide(SuspenderSleeping),
  Layer.provide(ScorerGroundTruthLive),
  Layer.provideMerge(EvalSandboxLive)
);
for (const [provider, ready] of [
  ["daytona", hasDaytona && hasCodex],
  ["upstash", hasUpstash && hasCodex],
  ["modal", hasModal && hasCodex],
  ["cloudflare", hasCloudflare && hasCodex],
  ["vercel", hasVercel && hasCodex],
] as const) {
  describe.skipIf(!ready)(`an agent trial against ${provider}`, () => {
    /* The whole product in one test: an agent is given a broken repository, it
     works inside a sandbox, and the verdict comes from running the verifier
     ourselves rather than from what the agent said it achieved. */
    it("lets Codex fix a broken task and scores it from ground truth", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const trial = yield* AgentTrial;
          return yield* trial.run({
            autoStopMinutes: 15,
            harness: "codex",
            harnessCredential: codexCredential,
            harnessVersion: "0.144.4",
            model: "gpt-5.6-sol",
            prompt: AGENT_PROMPT,
            provider,
            prepare: null,
            source: brokenSource,
            verifyCommand: VERIFY_COMMAND,
            workspace: "/tmp/anpord-task",
          });
        }).pipe(Effect.provide(TestLayer))
      );
      expect(result.outcome.status).toBe("passed");
      expect(result.outcome.passed).toBe(true);
      expect(result.outcome.voidFields).toEqual([]);
      /* The columns an eval platform reading a tool-call string cannot have. */
      expect(result.commands).toBeGreaterThan(0);
      expect(result.filesChanged.length).toBeGreaterThan(0);
      expect(Option.isSome(result.usage)).toBe(true);
      /* Model time is separated from sandbox time, or a slow provider reads as
         a slow model and the third axis becomes unreadable. */
      expect(result.outcome.modelMs).toBeGreaterThan(0);
      expect(result.outcome.sandboxMs).toBeGreaterThan(0);
    }, 900_000);
  });
}

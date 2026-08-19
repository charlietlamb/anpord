import { describe, expect, it } from "bun:test";
import { Effect, Layer } from "effect";
import type { ProviderName } from "../../src/domain/cell";
import { EvalSandboxLive } from "../../src/layer";
import { ScorerGroundTruthLive } from "../../src/scoring/ground-truth";
import { TrialRunner, TrialRunnerLive } from "../../src/services/trial-runner";

import {
  BROKEN_SOURCE,
  FIXED_SOURCE,
  TEST_SOURCE,
  VERIFY_COMMAND,
} from "../fixtures/broken-task";
import { hasDaytona, hasE2B } from "../fixtures/credentials";

const HAS_KEYS = hasDaytona && hasE2B;

const TestLayer = TrialRunnerLive.pipe(
  Layer.provide(ScorerGroundTruthLive),
  Layer.provideMerge(EvalSandboxLive)
);

const trial = (provider: ProviderName, source: string) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const runner = yield* TrialRunner;
      return yield* runner.run({
        autoStopMinutes: 10,
        files: { "total.mjs": source, "total.test.mjs": TEST_SOURCE },
        provider,
        setupCommand: null,
        verifyCommand: VERIFY_COMMAND,
        workspace: "/tmp/anpord-task",
      });
    }).pipe(Effect.provide(TestLayer))
  );

describe.if(HAS_KEYS)("a trial against a real provider", () => {
  /* The bracket: a verifier that cannot tell a solved task from a broken one
     is broken itself, and finding that out here costs less than finding it in
     a reported pass rate. */
  for (const provider of ["daytona", "e2b"] as const) {
    it(`${provider} fails the broken task and passes the fixed one`, async () => {
      const broken = await trial(provider, BROKEN_SOURCE);
      const fixed = await trial(provider, FIXED_SOURCE);

      expect(broken.outcome.status).toBe("failed");
      expect(broken.outcome.passed).toBe(false);
      expect(fixed.outcome.status).toBe("passed");
      expect(fixed.outcome.passed).toBe(true);

      expect(broken.outcome.voidFields).toEqual([]);
      expect(fixed.outcome.voidFields).toEqual([]);
      expect(fixed.sandboxId).not.toBe(broken.sandboxId);
    }, 240_000);
  }
});

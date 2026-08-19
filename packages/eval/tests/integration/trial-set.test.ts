import { describe, expect, it } from "bun:test";
import { Effect, Layer } from "effect";
import { EvalSandboxLive } from "../../src/layer";
import { TrialRunnerLive } from "../../src/services/trial-runner";
import { TrialSet, TrialSetLive } from "../../src/services/trial-set";

const HAS_KEY = hasDaytona;

import {
  FIXED_SOURCE,
  TEST_SOURCE,
  VERIFY_COMMAND,
} from "../fixtures/broken-task";
import { hasDaytona } from "../fixtures/credentials";

const TestLayer = TrialSetLive.pipe(
  Layer.provide(TrialRunnerLive),
  Layer.provideMerge(EvalSandboxLive)
);

describe.if(HAS_KEY)("a trial set against a real provider", () => {
  /* The unit the product reports. Three concurrent trials of one cell, which
     also exercises the per-provider semaphore against a live vendor rather
     than against a scripted adapter. */
  it("reports a distribution rather than a single verdict", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const set = yield* TrialSet;
        return yield* set.run({
          autoStopMinutes: 10,
          concurrency: 3,
          files: { "total.mjs": FIXED_SOURCE, "total.test.mjs": TEST_SOURCE },
          provider: "daytona",
          setupCommand: null,
          trials: 3,
          verifyCommand: VERIFY_COMMAND,
          workspace: "/tmp/anpord-task",
        });
      }).pipe(Effect.provide(TestLayer))
    );

    expect(result.outcomes).toHaveLength(3);
    expect(result.distribution.trials).toBe(3);
    expect(result.distribution.scored).toBe(3);
    expect(result.distribution.voided).toBe(0);
    expect(result.distribution.passRate).toBe(1);
    expect(result.distribution.deterministic).toBe(true);
  }, 300_000);
});

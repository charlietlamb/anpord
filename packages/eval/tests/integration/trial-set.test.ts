import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { Effect, Layer } from "effect";
import { EvalSandboxLive } from "../../src/layer";
import { TrialRunnerLive } from "../../src/services/trial-runner";
import { TrialSet, TrialSetLive } from "../../src/services/trial-set";

const SCRATCH =
  "/private/tmp/claude-501/-Users-charlielamb-Documents-anpord/12b411dd-d640-4169-a77f-0b9be144cdbd/scratchpad";

const keyed = (name: string) => {
  try {
    return readFileSync(`${SCRATCH}/${name}`, "utf8").trim();
  } catch {
    return;
  }
};

process.env.DAYTONA_API_KEY ??= keyed("daytona.key");
const HAS_KEY = Boolean(process.env.DAYTONA_API_KEY);

import {
  FIXED_SOURCE,
  TEST_SOURCE,
  VERIFY_COMMAND,
} from "../fixtures/broken-task";

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

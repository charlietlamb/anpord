import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { Effect, Layer } from "effect";
import type { ProviderName } from "../../src/domain/cell";
import { EvalSandboxLive } from "../../src/layer";
import { TrialRunner, TrialRunnerLive } from "../../src/services/trial-runner";

const SCRATCH =
  "/private/tmp/claude-501/-Users-charlielamb-Documents-anpord/12b411dd-d640-4169-a77f-0b9be144cdbd/scratchpad";

const keyed = (name: string) => {
  try {
    return readFileSync(`${SCRATCH}/${name}`, "utf8").trim();
  } catch {
    return;
  }
};

process.env.E2B_API_KEY ??= keyed("e2b.key");
process.env.DAYTONA_API_KEY ??= keyed("daytona.key");

const HAS_KEYS = Boolean(
  process.env.E2B_API_KEY && process.env.DAYTONA_API_KEY
);

import {
  BROKEN_SOURCE,
  FIXED_SOURCE,
  TEST_SOURCE,
  VERIFY_COMMAND,
} from "../fixtures/broken-task";

const TestLayer = TrialRunnerLive.pipe(Layer.provideMerge(EvalSandboxLive));

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

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

const BROKEN = "def total(items):\n    return sum(items) - 1\n";
const FIXED = "def total(items):\n    return sum(items)\n";
const TEST =
  "from calc import total\n\n\ndef test_total():\n    assert total([1, 2, 3]) == 6\n";

const TestLayer = TrialRunnerLive.pipe(Layer.provideMerge(EvalSandboxLive));

const trial = (provider: ProviderName, calc: string) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const runner = yield* TrialRunner;
      return yield* runner.run({
        autoStopMinutes: 10,
        files: { "calc.py": calc, "test_calc.py": TEST },
        provider,
        setupCommand: "python3 -m pip install --quiet pytest 2>&1 | tail -1",
        verifyCommand: "python3 -m pytest -q",
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
      const broken = await trial(provider, BROKEN);
      const fixed = await trial(provider, FIXED);

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

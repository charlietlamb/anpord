import { describe, expect, it } from "bun:test";
import { Effect, Stream } from "effect";
import {
  isUnguardedPipeline,
  ScorerGroundTruthLive,
} from "../../../src/adapters/scorers/ground-truth";
import { distributionOf } from "../../../src/domain/distribution";
import { outcomeOf } from "../../../src/domain/trial";
import type { ExecChunk, SandboxHandle } from "../../../src/ports/sandbox";
import { Scorer } from "../../../src/ports/scorer";
import { exit, stdout } from "../../fixtures/exec-chunk";

const sandboxYielding = (chunks: readonly ExecChunk[]): SandboxHandle => ({
  exec: () => Stream.fromIterable(chunks),
  id: "sbx-1",
  provider: "daytona",
  streaming: true,
  writeFile: () => Effect.void,
});

const score = (sandbox: SandboxHandle, verifyCommand: string | null) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const scorer = yield* Scorer;
      return yield* scorer.score({
        commandCount: 4,
        events: [],
        modelMs: 1000,
        sandbox,
        verifyCommand,
        workspace: "/tmp/w",
      });
    }).pipe(Effect.provide(ScorerGroundTruthLive))
  );

describe("isUnguardedPipeline", () => {
  /* Measured on both providers: bun test | tail exits 0 while the runner exits 1. A
     verifier written that way records every failure as a pass. */
  it("catches a verifier that would report its own success", () => {
    expect(isUnguardedPipeline("bun test | tail -1")).toBe(true);
    expect(isUnguardedPipeline("bun test")).toBe(false);
  });

  it("accepts a pipeline that guards its exit code", () => {
    expect(isUnguardedPipeline("set -o pipefail; bun test | tail -1")).toBe(
      false
    );
  });
});

describe("ScorerGroundTruthLive", () => {
  it("passes on a zero exit", async () => {
    const outcome = await score(
      sandboxYielding([stdout("1 pass"), exit(0)]),
      "bun test"
    );

    expect(outcome.status).toBe("passed");
  });

  it("fails on a non-zero exit", async () => {
    const outcome = await score(
      sandboxYielding([stdout("1 fail"), exit(1)]),
      "bun test"
    );

    expect(outcome.status).toBe("failed");
  });

  it("does not void a verifier that passed quietly", async () => {
    const outcome = await score(
      sandboxYielding([stdout(""), exit(0)]),
      "bun test"
    );

    expect(outcome.status).toBe("passed");
  });

  /* Nothing came back at all, so there is no evidence to score. */
  it("voids a verifier that never ran", async () => {
    const outcome = await score(sandboxYielding([]), "bun test");

    expect(outcome.status).toBe("void");
  });

  it("refuses to score through an unguarded pipeline", async () => {
    const outcome = await score(
      sandboxYielding([stdout("1 pass"), exit(0)]),
      "bun test | tail -1"
    );

    /* Failed, not void. A pipeline exits with its last command, so the
       verifier cannot be trusted and the case is wrong. Reporting that as
       void would put a misconfigured verifier through the same channel as a
       broken provider, and nothing downstream could tell them apart: one is
       a mistake somebody can fix, the other is an outage to wait out. */
    expect(outcome.status).toBe("failed");
    expect(outcome.passed).toBe(false);
  });

  /**
   * A verifier killed part-way through: output arrived, the exit code never
   * did, which is what a timeout actually looks like.
   *
   * The absent exit must never read as zero. Nothing else in the suite
   * distinguishes a truncated stream from a clean pass, and reading it as a
   * pass is this product's own headline failure happening inside the scorer
   * that exists to prevent it.
   */
  it("never reads a missing exit code as success", async () => {
    const outcome = await score(
      sandboxYielding([stdout("FAIL 3 tests failed")]),
      "node --test"
    );

    expect(outcome.passed).toBe(false);
    expect(outcome.exitCode).not.toBe(0);
  });

  it("keeps a refused verifier out of the void count", async () => {
    const outcome = await score(
      sandboxYielding([exit(0)]),
      "bun test | tail -1"
    );

    /* The distinction the void gate exists to protect: a cell whose verifier
       was refused still has a denominator, so it reports a real failure
       rather than an absence of evidence. */
    expect(outcome.voidFields).toEqual([]);
  });
});

describe("isUnguardedPipeline and ordinary commands", () => {
  /* Every one of these was refused by a bare substring test, which voided the
     whole cell before the sandbox was touched and reported a pass rate of
     zero with no diagnostic. */
  it("accepts a command whose pipe is not a pipeline", () => {
    for (const command of [
      "node --test || exit 1",
      "grep -E 'foo|bar' out.txt && node --test",
      'echo "a|b" && node --test',
      "awk '/a|b/' f && node --test",
    ]) {
      expect(isUnguardedPipeline(command)).toBe(false);
    }
  });

  it("still catches a real pipeline", () => {
    for (const command of [
      "node --test | tail -1",
      "node --test 2>&1 | head -5",
    ]) {
      expect(isUnguardedPipeline(command)).toBe(true);
    }
  });
});

describe("a case with no verifier", () => {
  /** The bug this prevents: substituting a verifier that always succeeds made
   * an imported case report a perfect, deterministic, promotable pass rate
   * from no evidence at all. That is the void gate's own failure wearing a
   * feature's clothes. */
  it("is void rather than passed", async () => {
    const outcome = await score(sandboxYielding([]), null);

    expect(outcome.status).toBe("void");
    expect(outcome.passed).toBe(false);
  });

  it("never counts toward a pass rate", () => {
    const voided = [1, 2, 3].map(() =>
      outcomeOf({
        commandCount: 0,
        exitCode: -1,
        fingerprint: { verify: "" },
        modelMs: 100,
        sandboxMs: 0,
      })
    );

    const distribution = distributionOf(voided);

    expect(distribution.scored).toBe(0);
    expect(distribution.voided).toBe(3);
    /* And so it cannot be promoted: promote refuses a cell with nothing
       scored, which is what makes the fix hold end to end. */
    expect(distribution.deterministic).toBe(false);
  });
});

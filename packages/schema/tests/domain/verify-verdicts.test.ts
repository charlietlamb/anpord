import { describe, expect, it } from "bun:test";
import { verdictsOf } from "../../src/domain/verify-verdicts";

const STEPS = ["test -f a", "test -f b", "test -f c"];

const trail = (...codes: readonly number[]) => ({
  verifySteps: codes.map((exitCode, index) => ({
    command: STEPS[index] ?? "",
    exitCode,
  })),
});

describe("judging each step of a verifier", () => {
  it("marks the failure and leaves the rest unreached", () => {
    expect(verdictsOf(STEPS, [trail(0, 1)])).toEqual([
      "passed",
      "failed",
      "unreached",
    ]);
  });

  it("passes every step when the trail runs to the end", () => {
    expect(verdictsOf(STEPS, [trail(0, 0, 0)])).toEqual([
      "passed",
      "passed",
      "passed",
    ]);
  });

  it("knows nothing about a trial without a trail", () => {
    expect(verdictsOf(STEPS, [{ verifySteps: [] }])).toEqual([
      "unknown",
      "unknown",
      "unknown",
    ]);
  });

  it("lets one failure across trials stand", () => {
    expect(verdictsOf(STEPS, [trail(0, 0, 0), trail(0, 1)])).toEqual([
      "passed",
      "failed",
      "passed",
    ]);
  });

  it("does not trust a trail that names a different step", () => {
    expect(
      verdictsOf(STEPS, [
        { verifySteps: [{ command: "something else", exitCode: 0 }] },
      ])
    ).toEqual(["unreached", "unreached", "unreached"]);
  });
});

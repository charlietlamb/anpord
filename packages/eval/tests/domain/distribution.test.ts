import { describe, expect, it } from "bun:test";
import { distributionOf } from "../../src/domain/distribution";
import type { TrialOutcome } from "../../src/domain/trial";

const outcome = (
  status: TrialOutcome["status"],
  commandCount: number
): TrialOutcome => ({
  commandCount,
  exitCode: status === "passed" ? 0 : 1,
  modelMs: 0,
  passed: status === "passed",
  sandboxMs: 0,
  status,
  voidFields: status === "void" ? ["tests"] : [],
});

describe("distributionOf", () => {
  it("reports a rate over scored trials, not over all of them", () => {
    const found = distributionOf([
      outcome("passed", 10),
      outcome("passed", 11),
      outcome("void", 0),
    ]);

    expect(found.trials).toBe(3);
    expect(found.scored).toBe(2);
    expect(found.voided).toBe(1);
    expect(found.passRate).toBe(1);
  });

  it("separates a deterministic cell from a lucky one", () => {
    const steady = distributionOf([
      outcome("passed", 9),
      outcome("passed", 10),
      outcome("passed", 11),
    ]);
    const erratic = distributionOf([
      outcome("passed", 9),
      outcome("failed", 41),
      outcome("passed", 12),
    ]);

    expect(steady.deterministic).toBe(true);
    expect(erratic.deterministic).toBe(false);
    expect(erratic.commandMin).toBe(9);
    expect(erratic.commandMax).toBe(41);
  });

  /* A cell where every trial voided has no rate to report. Returning zero
     rather than dividing by zero keeps the caller from rendering NaN as a
     score. */
  it("reports nothing rather than dividing by zero", () => {
    const found = distributionOf([outcome("void", 0), outcome("void", 0)]);

    expect(found.passRate).toBe(0);
    expect(found.scored).toBe(0);
    expect(found.deterministic).toBe(false);
  });
});

describe("what a distribution refuses to claim", () => {
  /* A single run agrees with itself and has no spread, so calling it
     deterministic would make the strongest claim the system offers from the
     one sample size that cannot support it. */
  it("never calls a single trial deterministic", () => {
    expect(distributionOf([outcome("passed", 10)]).deterministic).toBe(false);
  });

  /* The old ratio test called 100 to 149 commands tight because it scaled
     with the minimum. It is the same 49-command swing either way. */
  it("does not call a wide spread tight because the numbers are large", () => {
    const wide = distributionOf([
      outcome("passed", 100),
      outcome("passed", 149),
    ]);

    expect(wide.deterministic).toBe(false);
  });

  it("calls a genuinely steady cell deterministic", () => {
    const steady = distributionOf([
      outcome("passed", 9),
      outcome("passed", 10),
      outcome("passed", 11),
    ]);

    expect(steady.deterministic).toBe(true);
  });
});

describe("determinism needs both halves", () => {
  const at = (commandCount: number, passed: boolean): TrialOutcome => ({
    commandCount,
    exitCode: passed ? 0 : 1,
    modelMs: 1,
    passed,
    sandboxMs: 1,
    status: passed ? "passed" : "failed",
    voidFields: [],
  });

  /**
   * Agreement and a tight command spread are separate conditions, and the
   * existing erratic case varies both at once, so either one alone would
   * satisfy it. These pin them apart.
   *
   * Deterministic is the strongest claim this system makes, and half of the
   * conjunction was unverified.
   */
  it("refuses when the trials disagree, however tight the spread", () => {
    const split = distributionOf([
      at(10, true),
      at(10, true),
      at(10, false),
      at(10, false),
    ]);

    expect(split.commandMin).toBe(split.commandMax);
    expect(split.passRate).toBe(0.5);
    expect(split.deterministic).toBe(false);
  });

  it("refuses when the spread is wide, however complete the agreement", () => {
    const spread = distributionOf([at(4, true), at(9, true), at(31, true)]);

    expect(spread.passRate).toBe(1);
    expect(spread.deterministic).toBe(false);
  });

  it("claims it only when both hold", () => {
    expect(
      distributionOf([at(9, true), at(10, true), at(11, true)]).deterministic
    ).toBe(true);
  });
});

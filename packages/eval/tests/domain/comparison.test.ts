import { describe, expect, it } from "bun:test";
import { compare } from "../../src/domain/comparison";
import type { Distribution } from "../../src/domain/distribution";

const distribution = (input: Partial<Distribution>): Distribution => ({
  commandMax: 10,
  commandMedian: 10,
  commandMin: 10,
  deterministic: false,
  failed: 0,
  passed: 10,
  passRate: 1,
  scored: 10,
  trials: 10,
  voided: 0,
  ...input,
});

describe("compare", () => {
  it("reports a large drop as a regression", () => {
    const result = compare(
      distribution({ passRate: 1 }),
      distribution({ failed: 5, passed: 5, passRate: 0.5 })
    );

    expect(result.verdict).toBe("regressed");
    expect(result.delta).toBeCloseTo(-0.5);
  });

  it("reports a large rise as an improvement", () => {
    const result = compare(
      distribution({ passRate: 0.3 }),
      distribution({ passRate: 0.9 })
    );

    expect(result.verdict).toBe("improved");
  });

  it("treats a small difference as unchanged", () => {
    const result = compare(
      distribution({ passRate: 0.9 }),
      distribution({ passRate: 0.8 })
    );

    expect(result.verdict).toBe("unchanged");
  });

  /** The failure this whole product exists to avoid. A provider outage
   * produces a cell with nothing scored, and reading it as a measured zero
   * reports a collapse that never happened. */
  it("refuses to compare when this run scored nothing", () => {
    const result = compare(
      distribution({ passRate: 1 }),
      distribution({ passed: 0, passRate: 0, scored: 0, voided: 10 })
    );

    expect(result.verdict).toBe("incomparable");
    expect(result.delta).toBe(0);
  });

  it("refuses to compare against a baseline that scored nothing", () => {
    const result = compare(
      distribution({ passed: 0, passRate: 0, scored: 0, voided: 10 }),
      distribution({ passRate: 1 })
    );

    expect(result.verdict).toBe("incomparable");
  });

  /** The finding no score-based platform can produce: same pass rate, but the
   * agent stopped being repeatable. */
  it("calls lost determinism a regression at an unchanged pass rate", () => {
    const result = compare(
      distribution({ commandMax: 10, commandMin: 10, deterministic: true }),
      distribution({ commandMax: 40, commandMin: 9, deterministic: false })
    );

    expect(result.verdict).toBe("regressed");
    expect(result.determinismLost).toBe(true);
    expect(result.reason).toBe("the cell stopped agreeing with itself");
  });

  it("does not claim lost determinism from a single trial", () => {
    const result = compare(
      distribution({ deterministic: true }),
      distribution({ deterministic: false, passed: 1, scored: 1, trials: 1 })
    );

    expect(result.determinismLost).toBe(false);
    expect(result.verdict).toBe("unchanged");
  });

  it("does not invent a loss when the baseline was never deterministic", () => {
    const result = compare(
      distribution({ deterministic: false }),
      distribution({ deterministic: false })
    );

    expect(result.determinismLost).toBe(false);
  });
});

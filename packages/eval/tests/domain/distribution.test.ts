import { describe, expect, it } from "bun:test";
import type { EvalTrialStatus } from "@anpord/schema/domain/evals";
import { distributionOf } from "../../src/domain/distribution";

const outcome = (status: EvalTrialStatus, commands: number) => ({
  commands,
  status,
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

  it("reports nothing rather than dividing by zero", () => {
    const found = distributionOf([outcome("void", 0), outcome("void", 0)]);

    expect(found.passRate).toBe(0);
    expect(found.scored).toBe(0);
    expect(found.deterministic).toBe(false);
  });
});

describe("what a distribution refuses to claim", () => {
  it("never calls a single trial deterministic", () => {
    expect(distributionOf([outcome("passed", 10)]).deterministic).toBe(false);
  });

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
  const at = (commands: number, passed: boolean) => ({
    commands,
    status: passed ? ("passed" as const) : ("failed" as const),
  });

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

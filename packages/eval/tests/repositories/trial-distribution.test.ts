import { describe, expect, it } from "bun:test";
import type { evalTrial } from "@anpord/db/schema/evals/eval-trials";
import { distributionFor } from "../../src/repositories/trial-distribution";

type TrialRow = typeof evalTrial.$inferSelect;

const row = (status: string, passed: boolean | null): TrialRow => ({
  cellInternalId: "cell_1",
  commandCount: 3,
  createdAt: new Date(0),
  exitCode: passed === true ? 0 : 1,
  failure: null,
  finishedAt: null,
  internalId: `trial_${status}_${String(passed)}`,
  modelMs: 0,
  ordinal: 0,
  passed,
  prepared: null,
  provider: "daytona",
  sandboxId: null,
  sandboxMs: 0,
  startedAt: null,
  status,
  usage: null,
  verifySteps: null,
  voidFields: null,
});

describe("distributionFor", () => {
  it("scores only the statuses a trial can settle into", () => {
    const found = distributionFor([
      row("passed", true),
      row("failed", false),
      row("void", null),
      row("queued", null),
      row("running", null),
    ]);

    expect(found.trials).toBe(3);
    expect(found.scored).toBe(2);
    expect(found.voided).toBe(1);
    expect(found.passRate).toBe(0.5);
  });

  /* "exceeded" was declared, settled, and never written. Nothing sets it now,
     but the column is free text, so a row carrying it must not be scored: a
     dead status counted as a failure halves a pass rate and can turn a clean
     cell into a reported regression. */
  it("ignores a status the domain does not declare", () => {
    const clean = distributionFor([row("passed", true), row("passed", true)]);
    const withStray = distributionFor([
      row("passed", true),
      row("passed", true),
      row("exceeded", false),
    ]);

    expect(clean.passRate).toBe(1);
    expect(withStray.passRate).toBe(1);
    expect(withStray.scored).toBe(2);
    expect(withStray.trials).toBe(2);
  });
});

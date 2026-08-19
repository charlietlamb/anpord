import { describe, expect, it } from "bun:test";
import type { Distribution } from "../../src/domain/distribution";
import {
  axisVerdict,
  type CellResult,
  planMatrix,
} from "../../src/domain/matrix";

const distribution = (passRate: number): Distribution => ({
  commandMax: 12,
  commandMedian: 10,
  commandMin: 9,
  deterministic: true,
  failed: 0,
  passed: 10,
  passRate,
  scored: 10,
  trials: 10,
  voided: 0,
});

const cell = (
  harness: "codex" | "claude-code",
  provider: "e2b" | "daytona"
) => ({
  cellKey: `${harness}-${provider}` as never,
  harness,
  harnessVersion: "1",
  model: "gpt-5.2",
  provider,
});

describe("planMatrix", () => {
  it("expands every axis into a cell", () => {
    const plan = planMatrix({
      axes: {
        harnesses: ["codex"],
        models: ["a", "b"],
        providers: ["e2b", "daytona"],
      },
      harnessVersions: { codex: "0.144.4" },
      taskId: "fix-parser",
      taskVersion: "1",
      trials: 10,
    });

    expect(plan.cells).toHaveLength(4);
    expect(plan.trialCount).toBe(40);
    expect(new Set(plan.cells.map((c) => c.cellKey)).size).toBe(4);
  });

  /* An unknown harness version must not silently share a key with a known one,
     or two different harnesses compare as the same cell. */
  it("marks a missing harness version rather than omitting it", () => {
    const plan = planMatrix({
      axes: { harnesses: ["codex"], models: ["a"], providers: ["e2b"] },
      harnessVersions: {},
      taskId: "t",
      taskVersion: "1",
      trials: 1,
    });

    expect(plan.cells[0]?.harnessVersion).toBe("unknown");
  });
});

describe("axisVerdict", () => {
  it("reports an axis that separated", () => {
    const results: CellResult[] = [
      { cell: cell("codex", "e2b"), distribution: distribution(1) },
      { cell: cell("claude-code", "e2b"), distribution: distribution(0.4) },
    ];

    const verdict = axisVerdict(results, "harness");

    expect(verdict.separated).toBe(true);
    expect(verdict.spread).toBeCloseTo(0.6);
  });

  /* The finding that tells a customer to stop paying for a dimension. A bare
     table would let them read two near-identical numbers as a preference. */
  it("reports an axis that did not separate", () => {
    const results: CellResult[] = [
      { cell: cell("codex", "e2b"), distribution: distribution(0.9) },
      { cell: cell("codex", "daytona"), distribution: distribution(0.95) },
    ];

    const verdict = axisVerdict(results, "provider");

    expect(verdict.separated).toBe(false);
    expect(verdict.values).toEqual(["e2b", "daytona"]);
  });

  it("never separates on a single value", () => {
    const results: CellResult[] = [
      { cell: cell("codex", "e2b"), distribution: distribution(1) },
    ];

    expect(axisVerdict(results, "harness").separated).toBe(false);
  });
});

describe("what an axis verdict refuses to claim", () => {
  const voidedCell = (harness: "codex" | "claude-code") => ({
    cell: cell(harness, "e2b"),
    distribution: {
      ...distribution(0),
      passed: 0,
      scored: 0,
      trials: 10,
      voided: 10,
    },
  });

  /* A cell where nothing scored has a pass rate of zero because there is
     nothing to divide, not because the agent failed. Reading that sentinel as
     a measured rate turns a provider outage into the headline finding that
     the other provider is better. */
  it("does not read a fully voided cell as a zero pass rate", () => {
    const verdict = axisVerdict(
      [
        voidedCell("codex"),
        { cell: cell("claude-code", "daytona"), distribution: distribution(1) },
      ],
      "harness"
    );

    expect(verdict.separated).toBe(false);
    expect(verdict.values).toEqual(["claude-code"]);
  });

  it("reports no separation when nothing scored at all", () => {
    const verdict = axisVerdict(
      [voidedCell("codex"), voidedCell("claude-code")],
      "harness"
    );

    expect(verdict.separated).toBe(false);
    expect(verdict.spread).toBe(0);
  });
});

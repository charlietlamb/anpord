import { describe, expect, test } from "bun:test";
import { EvalGate, problemsWith } from "../../src/cli/eval-gate";
import {
  createCell,
  createComparison,
  createRun,
  createTrial,
} from "../fixtures/eval-run";

describe("the eval gate", () => {
  test("strict passes only completed passing trials", () => {
    expect(problemsWith(createRun(), "strict")).toEqual([]);
  });

  test.each([
    "failed",
    "void",
    "running",
  ] as const)("strict rejects a %s trial without a baseline", (status) => {
    const run = createRun({
      cells: [createCell({ trials: [createTrial({ status, passed: false })] })],
    });
    expect(problemsWith(run, "strict")).toEqual([
      `fixture, trial 1: ${status}.`,
    ]);
  });

  test("strict rejects missing and incomplete trial evidence", () => {
    for (const cell of [
      createCell({ trials: [] }),
      createCell({ status: "running" }),
    ]) {
      expect(
        problemsWith(createRun({ cells: [cell] }), "strict")
      ).not.toBeEmpty();
    }
  });

  test("strict requires all requested cells and trials", () => {
    expect(
      problemsWith(createRun(), "strict", { cells: 2, trials: 1 })
    ).not.toBeEmpty();
    expect(
      problemsWith(createRun(), "strict", { cells: 1, trials: 3 })
    ).not.toBeEmpty();
  });

  test.each([
    ...EvalGate.literals,
  ])("%s never hides an empty or failed run", (gate) => {
    expect(problemsWith(createRun({ cells: [] }), gate)).not.toBeEmpty();
    expect(
      problemsWith(createRun({ status: "running" }), gate)
    ).not.toBeEmpty();
    expect(
      problemsWith(
        createRun({ status: "failed", failure: "sandbox died" }),
        gate
      )
    ).toEqual(["sandbox died"]);
  });

  test("regression mode measures the baseline instead of absolute passes", () => {
    const run = createRun({
      cells: [
        createCell({
          comparison: createComparison({
            verdict: "regressed",
            baselinePassRate: 0.9,
            candidatePassRate: 0.5,
          }),
        }),
      ],
    });
    expect(problemsWith(run, "regressed")).toEqual([
      "fixture regressed against its baseline: pass rate 0.9 → 0.5.",
    ]);
    expect(problemsWith(run, "never")).toEqual([]);
  });

  test("unscored mode also rejects cells without scored trials", () => {
    const run = createRun({ cells: [createCell({ distribution: null })] });
    expect(problemsWith(run, "regressed")).toEqual([]);
    expect(problemsWith(run, "unscored")).toEqual([
      "fixture produced no scored trials.",
    ]);
  });

  test("names both harness and profile versions when they change", () => {
    const run = createRun({
      tasks: [
        {
          harness: "codex",
          harnessVersion: "2.0.0",
          model: "test",
          provider: "e2b",
          profile: { name: "house", version: "new" },
        },
      ],
      cells: [
        createCell({
          comparison: createComparison({
            verdict: "regressed",
            candidateHarnessVersion: "2.0.0",
            baselineProfileVersion: "old",
            candidateProfileVersion: "new",
            baselinePassRate: 0.9,
            candidatePassRate: 0.5,
          }),
        }),
      ],
    });
    expect(problemsWith(run, "regressed")[0]).toContain(
      "codex 1.0.0 → 2.0.0, house old → new"
    );
  });
});

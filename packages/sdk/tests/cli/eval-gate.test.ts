import { describe, expect, test } from "bun:test";
import type { EvalRun } from "@anpord/schema/domain/evals";
import { problemsWith } from "../../src/cli/eval-gate";

const comparisonOf = (
  verdict: string,
  versions: readonly [string, string] = ["0.144.4", "0.144.4"]
) => ({
  baselineHarnessVersion: versions[0],
  baselinePassRate: 0.9,
  candidateHarnessVersion: versions[1],
  candidatePassRate: 0.5,
  verdict,
});

const cell = (
  caseName: string,
  verdict: string | null,
  scored: number,
  versions?: readonly [string, string]
) =>
  ({
    caseName,
    comparison: verdict === null ? null : comparisonOf(verdict, versions),
    distribution: { scored },
    taskIndex: 0,
  }) as never;

const finished = (cells: readonly unknown[]) =>
  ({
    cells,
    failure: null,
    status: "finished",
    tasks: [{ harness: "codex" }],
  }) as unknown as EvalRun;

describe("what makes a run fail the command", () => {
  test("a clean grid reports nothing", () => {
    expect(
      problemsWith(finished([cell("a", "improved", 3)]), "regressed")
    ).toEqual([]);
  });

  test("a regressed cell is named with its pass rates", () => {
    expect(
      problemsWith(
        finished([cell("a", "improved", 3), cell("b", "regressed", 3)]),
        "regressed"
      )
    ).toEqual(["b regressed against its baseline: pass rate 0.9 → 0.5."]);
  });

  test("a harness release that regressed names both versions", () => {
    expect(
      problemsWith(
        finished([cell("b", "regressed", 3, ["0.144.4", "0.145.0"])]),
        "regressed"
      )
    ).toEqual([
      "b regressed against its baseline: codex 0.144.4 → 0.145.0, pass rate 0.9 → 0.5.",
    ]);
  });

  test("an unscored cell passes unless it is asked about", () => {
    const run = finished([cell("c", null, 0)]);

    expect(problemsWith(run, "regressed")).toEqual([]);
    expect(problemsWith(run, "unscored")).toEqual([
      "c produced no scored trials.",
    ]);
  });

  test("never leaves results alone", () => {
    expect(
      problemsWith(finished([cell("b", "regressed", 3)]), "never")
    ).toEqual([]);
  });

  test("a run that failed is reported whatever the gate", () => {
    const run = {
      cells: [],
      failure: "sandbox died",
      status: "failed",
    } as unknown as EvalRun;

    expect(problemsWith(run, "never")).toEqual(["sandbox died"]);
  });
});

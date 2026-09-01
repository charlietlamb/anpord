import { describe, expect, test } from "bun:test";
import type { EvalRun } from "@anpord/schema/domain/evals";
import { problemsWith } from "../../src/cli/eval-gate";

const cell = (caseName: string, verdict: string | null, scored: number) =>
  ({
    caseName,
    comparison: verdict === null ? null : { verdict },
    distribution: { scored },
  }) as never;

const finished = (cells: readonly unknown[]) =>
  ({ cells, failure: null, status: "finished" }) as unknown as EvalRun;

describe("what makes a run fail the command", () => {
  test("a clean grid reports nothing", () => {
    expect(
      problemsWith(finished([cell("a", "improved", 3)]), "regressed")
    ).toEqual([]);
  });

  test("a regressed cell is named", () => {
    expect(
      problemsWith(
        finished([cell("a", "improved", 3), cell("b", "regressed", 3)]),
        "regressed"
      )
    ).toEqual(["b regressed against its baseline."]);
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

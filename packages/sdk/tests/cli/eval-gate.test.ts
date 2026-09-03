import { describe, expect, test } from "bun:test";
import type { EvalRun } from "@anpord/schema/domain/evals";
import { problemsWith } from "../../src/cli/eval-gate";

const comparisonOf = (
  verdict: string,
  versions: readonly [string, string] = ["0.144.4", "0.144.4"],
  profiles: readonly [string | null, string | null] = [null, null]
) => ({
  baselineHarnessVersion: versions[0],
  baselinePassRate: 0.9,
  baselineProfileVersion: profiles[0],
  candidateHarnessVersion: versions[1],
  candidatePassRate: 0.5,
  candidateProfileVersion: profiles[1],
  verdict,
});

const cell = (
  caseName: string,
  verdict: string | null,
  scored: number,
  versions?: readonly [string, string],
  profiles?: readonly [string | null, string | null]
) =>
  ({
    caseName,
    comparison:
      verdict === null ? null : comparisonOf(verdict, versions, profiles),
    distribution: { scored },
    taskIndex: 0,
  }) as never;

const finished = (
  cells: readonly unknown[],
  task: unknown = { harness: "codex" }
) =>
  ({
    cells,
    failure: null,
    status: "finished",
    tasks: [task],
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

  test("a profile edit that regressed names the profile and both versions", () => {
    expect(
      problemsWith(
        finished(
          [cell("b", "regressed", 3, undefined, ["a1b2c3d4", "0f9e8d7c"])],
          {
            harness: "opencode",
            profile: { name: "craft", version: "0f9e8d7c" },
          }
        ),
        "regressed"
      )
    ).toEqual([
      "b regressed against its baseline: craft a1b2c3d4 → 0f9e8d7c, pass rate 0.9 → 0.5.",
    ]);
  });

  test("a base release under a profile names both changes", () => {
    expect(
      problemsWith(
        finished(
          [
            cell(
              "b",
              "regressed",
              3,
              ["1.18.21", "1.19.0"],
              ["a1b2c3d4", "0f9e8d7c"]
            ),
          ],
          {
            harness: "opencode",
            profile: { name: "craft", version: "0f9e8d7c" },
          }
        ),
        "regressed"
      )
    ).toEqual([
      "b regressed against its baseline: opencode 1.18.21 → 1.19.0, craft a1b2c3d4 → 0f9e8d7c, pass rate 0.9 → 0.5.",
    ]);
  });

  test("a profile held steady is not mentioned", () => {
    expect(
      problemsWith(
        finished(
          [cell("b", "regressed", 3, undefined, ["a1b2c3d4", "a1b2c3d4"])],
          {
            harness: "opencode",
            profile: { name: "craft", version: "a1b2c3d4" },
          }
        ),
        "regressed"
      )
    ).toEqual(["b regressed against its baseline: pass rate 0.9 → 0.5."]);
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

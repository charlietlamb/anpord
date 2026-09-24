import { describe, expect, test } from "bun:test";
import { EvalGate, problemsWith } from "../../src/cli/eval-gate";
import { createBatch, createRun, createTrial } from "../fixtures/eval-run";

const ONE = { runs: 1, trials: 1 };

describe("the eval gate", () => {
  test.each([
    "failures",
    "strict",
  ] as const)("%s passes a batch whose trials all passed", (gate) => {
    expect(problemsWith(createBatch(), gate, ONE)).toEqual([]);
  });

  test.each([
    "failed",
    "void",
    "running",
  ] as const)("failures rejects a %s trial", (status) => {
    const batch = createBatch({
      runs: [createRun({ trials: [createTrial({ status })] })],
    });
    expect(problemsWith(batch, "failures", ONE)).toEqual([
      `fixture, trial 1: ${status}.`,
    ]);
  });

  test("failures rejects a failed run", () => {
    const batch = createBatch({ runs: [createRun({ status: "failed" })] });
    expect(problemsWith(batch, "failures", ONE)).toEqual(["fixture failed."]);
  });

  test("strict rejects missing and incomplete trial evidence", () => {
    for (const run of [
      createRun({ trials: [] }),
      createRun({ status: "running" }),
    ]) {
      expect(
        problemsWith(createBatch({ runs: [run] }), "strict", ONE)
      ).not.toBeEmpty();
    }
  });

  test("strict requires every expected run and trial", () => {
    expect(
      problemsWith(createBatch(), "strict", { runs: 2, trials: 1 })
    ).not.toBeEmpty();
    expect(
      problemsWith(createBatch(), "strict", { runs: 1, trials: 3 })
    ).not.toBeEmpty();
    expect(
      problemsWith(createBatch(), "failures", { runs: 2, trials: 3 })
    ).toEqual([]);
  });

  test("never ignores failing trials", () => {
    const batch = createBatch({
      runs: [createRun({ trials: [createTrial({ status: "failed" })] })],
    });
    expect(problemsWith(batch, "never", ONE)).toEqual([]);
  });

  test.each([
    ...EvalGate.literals,
  ])("%s never hides an empty or failed batch", (gate) => {
    expect(problemsWith(createBatch({ runs: [] }), gate, ONE)).not.toBeEmpty();
    expect(
      problemsWith(createBatch({ status: "running" }), gate, ONE)
    ).not.toBeEmpty();
    expect(
      problemsWith(
        createBatch({ failure: "sandbox died", status: "failed" }),
        gate,
        ONE
      )
    ).toEqual(["sandbox died"]);
  });
});

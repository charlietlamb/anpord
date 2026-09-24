import { describe, expect, test } from "bun:test";
import { batchError, EvalGate, problemsWith } from "../../src/cli/eval-gate";
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
      `fixture on codex/test, trial 1: ${status}.`,
    ]);
  });

  test("failures rejects a failed run", () => {
    const batch = createBatch({ runs: [createRun({ status: "failed" })] });
    expect(problemsWith(batch, "failures", ONE)).toEqual([
      "fixture on codex/test failed.",
    ]);
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

  test("an empty, unfinished or failed batch is an error whatever the gate", () => {
    expect(batchError(createBatch())).toBeNull();
    expect(batchError(createBatch({ runs: [] }))).not.toBeNull();
    expect(batchError(createBatch({ status: "running" }))).not.toBeNull();
    expect(
      batchError(createBatch({ failure: "sandbox died", status: "failed" }))
    ).toBe("sandbox died");
  });

  test.each([
    ...EvalGate.literals,
  ])("%s names the variant alongside the case", (gate) => {
    const batch = createBatch({
      runs: [createRun({ status: "failed", trials: [] })],
    });
    const problems = problemsWith(batch, gate, ONE);
    expect(problems.every((line) => line.includes("codex/test"))).toBe(true);
  });
});

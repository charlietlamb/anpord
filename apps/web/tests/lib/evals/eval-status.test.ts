import { describe, expect, test } from "bun:test";
import { runStatus } from "@anpord/ui/lib/evals/eval-status";

const run = (
  status: "failed" | "finished" | "running",
  passed: number,
  scored: number
) => ({ distribution: { passed, scored }, status });

describe("reading a run's status", () => {
  test("says what a running run is doing rather than that it has no score", () => {
    expect(runStatus(run("running", 0, 0)).label).toBe("Running");
  });

  test("keeps the scores of a run that failed after scoring them", () => {
    expect(runStatus(run("failed", 3, 3)).label).toBe("3/3 passed");
  });

  test("reports the failure when a run failed before it scored anything", () => {
    expect(runStatus(run("failed", 0, 0)).label).toBe("Failed");
  });

  test("reports a finished run by its distribution", () => {
    expect(runStatus(run("finished", 1, 2)).label).toBe("1/2 passed");
  });
});

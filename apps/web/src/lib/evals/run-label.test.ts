import { describe, expect, it } from "bun:test";
import { runLabel } from "./run-label";

describe("runLabel", () => {
  it("uses the eval name when the run has one", () => {
    expect(
      runLabel({
        cases: ["cold-start", "data-rich"],
        id: "run_123",
        name: "planner-core",
      })
    ).toBe("planner-core");
  });

  it("keeps the case-based label for legacy unnamed runs", () => {
    expect(
      runLabel({
        cases: ["cold-start", "data-rich"],
        id: "run_123",
        name: null,
      })
    ).toBe("cold-start +1");
  });
});

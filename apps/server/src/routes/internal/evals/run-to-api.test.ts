import { describe, expect, it } from "bun:test";
import type { GridRunState } from "@anpord/eval/grid/state";
import { Option } from "effect";
import { detail, summarise } from "./run-to-api";

const state = (name: string | null): GridRunState => ({
  cases: ["cold-start", "data-rich"],
  cells: [],
  failure: Option.none(),
  finishedAt: Option.none(),
  id: "run_123",
  name,
  organizationId: "org_123",
  startedAt: 1,
  status: "running",
  tasks: [],
});

describe("eval run names", () => {
  it("returns the persisted eval name in summaries and details", () => {
    const run = state("planner-core");

    expect(summarise(run).name).toBe("planner-core");
    expect(detail(run, []).name).toBe("planner-core");
  });

  it("does not present the first case as an eval name", () => {
    const summary = summarise(state(null));

    expect(summary.name).toBeNull();
    expect(summary.firstCaseName).toBe("cold-start");
  });
});

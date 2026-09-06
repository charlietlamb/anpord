import { describe, expect, it } from "bun:test";
import type { GridRunState } from "@anpord/eval/grid/state";
import { Option } from "effect";
import { detail, summarise } from "./run-to-api";

const state = (name: string | null): GridRunState => ({
  trigger: {
    source: "ci",
    url: "https://github.com/acme/app/actions/runs/123",
  },
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
    expect(summarise(run).trigger).toEqual(run.trigger);
    expect(detail(run, []).trigger).toEqual(run.trigger);
  });

  it("does not present the first case as an eval name", () => {
    const summary = summarise(state(null));

    expect(summary.name).toBeNull();
    expect(summary.firstCaseName).toBe("cold-start");
  });
});

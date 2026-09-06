import { describe, expect, it } from "bun:test";
import { trialRowsOf } from "./trial-rows";

const trial = (ordinal: number) => ({ ordinal, status: "passed" }) as never;

const reading = (id: string, trials: number) => ({
  distribution: {} as never,
  finishedAt: null,
  internalId: `cell_${id}`,
  runId: `run_${id}`,
  trials: Array.from({ length: trials }, (_, index) => trial(index + 1)),
});

describe("trialRowsOf", () => {
  it("flattens every trial of every reading", () => {
    const rows = trialRowsOf([reading("a", 2), reading("b", 1)]);

    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.runIdFull)).toEqual([
      "run_a",
      "run_a",
      "run_b",
    ]);
  });

  it("names the run on its first trial only", () => {
    const rows = trialRowsOf([reading("a", 3)]);

    expect(rows.map((row) => row.runId)).toEqual(["run_a", null, null]);
  });

  it("keys a row by its reading and ordinal, so two runs never collide", () => {
    const rows = trialRowsOf([reading("a", 1), reading("b", 1)]);

    expect(new Set(rows.map((row) => row.key)).size).toBe(2);
  });

  it("says nothing when a reading recorded no trials", () => {
    expect(trialRowsOf([reading("a", 0)])).toEqual([]);
  });
});

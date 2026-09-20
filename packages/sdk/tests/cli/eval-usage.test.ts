import { describe, expect, it } from "bun:test";
import {
  formatTokens,
  formatUsd,
  localUsageLines,
} from "../../src/cli/eval-usage";

const counts = (inputTokens: number, outputTokens: number) => ({
  cacheReadTokens: 0,
  inputTokens,
  outputTokens,
});

describe("what the cli says a run spent", () => {
  it("says nothing when the harness reported no tokens", () => {
    expect(localUsageLines([{ turns: 4, usage: null }])).toEqual([]);
  });

  it("states the totals in a single line", () => {
    const [spend] = localUsageLines([
      { turns: 10, usage: counts(25_000, 1000) },
    ]);

    expect(spend).toContain("26k tokens");
    expect(spend).toContain("25k in");
    expect(spend).toContain("1k out");
  });

  /* The run that exhausted a quota: same turn count, ten times the context. */
  it("names the reason when a context grew fast", () => {
    const lines = localUsageLines([
      { turns: 12, usage: counts(275_464, 1442) },
    ]);

    expect(lines.join(" ")).toContain("re-sends");
  });

  it("adds up every case in the run", () => {
    const [spend] = localUsageLines([
      { turns: 5, usage: counts(1000, 100) },
      { turns: 5, usage: counts(2000, 200) },
    ]);

    expect(spend).toContain("3k tokens");
  });
});

describe("how the numbers read", () => {
  it.each([
    [999, "999"],
    [1500, "2k"],
    [2_400_000, "2.4M"],
  ])("writes %i as %s", (value, shown) => {
    expect(formatTokens(value)).toBe(shown);
  });

  it("does not round a small spend away to nothing", () => {
    expect(formatUsd(0.004)).toBe("<$0.01");
  });
});

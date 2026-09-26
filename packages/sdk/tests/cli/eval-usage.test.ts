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
    expect(localUsageLines([{ commands: 4, usage: null }])).toEqual([]);
  });

  it("states the totals in a single line", () => {
    const [spend] = localUsageLines([
      { commands: 10, usage: counts(25_000, 1000) },
    ]);

    expect(spend).toContain("26k tokens");
    expect(spend).toContain("25k in");
    expect(spend).toContain("1k out");
  });

  /* The run that exhausted a quota: same turn count, ten times the context. */
  it("names the reason when a context grew fast", () => {
    const lines = localUsageLines([
      { commands: 12, usage: counts(275_464, 1442) },
    ]);

    expect(lines.join(" ")).toContain("re-sends");
  });

  it("adds up every case in the run", () => {
    const [spend] = localUsageLines([
      { commands: 5, usage: counts(1000, 100) },
      { commands: 5, usage: counts(2000, 200) },
    ]);

    expect(spend).toContain("3k tokens");
  });
});

describe("what a recorded local run says it cost", () => {
  const part = (component: "model" | "user" | "judge", usd: number | null) => ({
    classification: "estimate" as const,
    component,
    detail: {},
    explanation: "",
    source: "aggregate",
    usd,
  });
  const costs = (components: ReturnType<typeof part>[]) => ({
    allocatedUsd: 0,
    components,
    estimatedEquivalentUsd: 0.46,
    incomplete: false,
    knownActualUsd: 0,
  });

  it("puts the priced total beside the tokens, and who spent it", () => {
    expect(
      localUsageLines(
        [{ commands: 10, usage: counts(25_000, 1000) }],
        costs([part("model", 0.42), part("user", 0.03), part("judge", 0.01)])
      )
    ).toEqual([
      "  26k tokens (25k in, 1k out), $0.46 est.",
      "  model $0.42, simulated user $0.03, judges $0.01",
    ]);
  });

  it("gives only the total when the agent spent all of it", () => {
    expect(
      localUsageLines(
        [{ commands: 10, usage: counts(25_000, 1000) }],
        costs([part("model", 0.46)])
      )
    ).toEqual(["  26k tokens (25k in, 1k out), $0.46 est."]);
  });

  it("says which part could not be priced", () => {
    expect(
      localUsageLines(
        [{ commands: 10, usage: counts(25_000, 1000) }],
        costs([part("model", 0.46), part("judge", null)])
      )
    ).toEqual([
      "  26k tokens (25k in, 1k out), $0.46 est.",
      "  model $0.46, judges not priced",
    ]);
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

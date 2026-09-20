import { describe, expect, it } from "bun:test";
import { perTurnInput, usageConcerns } from "../../src/domain/usage-health";

const usage = (inputTokens: number, cacheReadTokens = 0) => ({
  cacheReadTokens,
  cacheWriteTokens: 0,
  inputTokens,
  outputTokens: 1000,
  totalTokens: inputTokens + cacheReadTokens + 1000,
});

describe("what a trial's usage says about it", () => {
  /* The numbers below are the real spread from the runs that exhausted a
     Codex quota: the cheap trials sat near 2.5k per turn and the expensive
     ones near 25k, for the same number of turns. */
  it("says nothing about a trial that kept its context small", () => {
    expect(usageConcerns({ turns: 10, usage: usage(25_759) })).toEqual([]);
  });

  it("notices a context that grew fast", () => {
    expect(usageConcerns({ turns: 12, usage: usage(275_464) })).toContain(
      "context-grew-fast"
    );
  });

  it("notices that nothing was cached", () => {
    expect(usageConcerns({ turns: 12, usage: usage(275_464) })).toContain(
      "nothing-cached"
    );
  });

  it("stays quiet about a cache that worked", () => {
    expect(
      usageConcerns({ turns: 12, usage: usage(60_000, 200_000) })
    ).not.toContain("nothing-cached");
  });

  /* A short trial can be cheap and uncached without anything being wrong. */
  it("does not call a small trial uncached", () => {
    expect(usageConcerns({ turns: 2, usage: usage(4000) })).toEqual([]);
  });

  it("reads per-turn input without dividing by nothing", () => {
    expect(perTurnInput({ turns: 0, usage: usage(5000) })).toBe(5000);
  });
});

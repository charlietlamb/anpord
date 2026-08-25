import { describe, expect, it } from "bun:test";
import type { HarnessUsage } from "../../src/domain/harness-event";
import {
  cacheHitOf,
  costOf,
  type ModelPrice,
} from "../../src/domain/model-price";

/* Anthropic's published rates for Sonnet, in dollars per million. */
const SONNET: ModelPrice = {
  cacheRead: 0.2,
  cacheWrite: 2.5,
  input: 2,
  output: 10,
};

const usage = (
  parts: Partial<HarnessUsage> & { readonly inputTokens: number }
): HarnessUsage => ({
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
  ...parts,
});

describe("model price", () => {
  it("charges input and output at their own rates", () => {
    const cost = costOf(
      usage({ inputTokens: 1_000_000, outputTokens: 1_000_000 }),
      SONNET
    );

    expect(cost).toBeCloseTo(12, 6);
  });

  /* The comparison the whole feature exists to make visible: the same
     context, served from cache, costs a fraction of the first run. */
  it("charges a cached read far below fresh input", () => {
    const fresh = costOf(usage({ inputTokens: 1_000_000 }), SONNET);
    const cached = costOf(
      usage({ cacheReadTokens: 1_000_000, inputTokens: 0 }),
      SONNET
    );

    expect(fresh).toBeCloseTo(2, 6);
    expect(cached).toBeCloseTo(0.2, 6);
  });

  it("charges a cache write above fresh input", () => {
    const written = costOf(
      usage({ cacheWriteTokens: 1_000_000, inputTokens: 0 }),
      SONNET
    );

    expect(written).toBeCloseTo(2.5, 6);
  });

  /* A model with no published cache rate is not a free cache. */
  it("falls back to the input rate where no cache rate is published", () => {
    const priced: ModelPrice = { ...SONNET, cacheRead: null, cacheWrite: null };
    const cost = costOf(
      usage({ cacheReadTokens: 1_000_000, inputTokens: 0 }),
      priced
    );

    expect(cost).toBeCloseTo(2, 6);
  });

  it("reads the cache share of everything the model was served", () => {
    const hit = cacheHitOf(
      usage({ cacheReadTokens: 900, cacheWriteTokens: 0, inputTokens: 100 })
    );

    expect(hit).toBeCloseTo(0.9, 6);
  });

  /* A rate needs a denominator: no tokens is not a zero-percent hit rate,
     and reporting one would claim a cache missed when nothing was asked. */
  it("reports no hit rate when nothing was served", () => {
    expect(cacheHitOf(usage({ inputTokens: 0 }))).toBeNull();
  });

  it("counts a cache write against the hit rate", () => {
    const hit = cacheHitOf(
      usage({ cacheReadTokens: 0, cacheWriteTokens: 1000, inputTokens: 0 })
    );

    expect(hit).toBe(0);
  });
});

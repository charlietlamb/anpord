import { describe, expect, it } from "bun:test";
import type { HarnessUsage } from "@anpord/schema/domain/harness-event";
import { usageOf } from "../../src/domain/harness-event";
import { costOf, type ModelPrice } from "../../src/domain/model-price";

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

describe("cache writes kept for an hour", () => {
  it("charges them at twice the input rate and the rest at the five minute rate", () => {
    expect(
      costOf(
        usage({
          cacheWrite1hTokens: 1_000_000,
          cacheWriteTokens: 3_000_000,
          inputTokens: 0,
        }),
        SONNET
      )
    ).toBeCloseTo(9, 9);
  });

  it("prices usage stored before the split as five minute writes", () => {
    const stored = usageOf({
      cacheReadTokens: 0,
      cacheWriteTokens: 1_000_000,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 1_000_000,
    });

    expect([
      stored?.cacheWrite1hTokens,
      stored && costOf(stored, SONNET),
    ]).toEqual([undefined, 2.5]);
  });

  it("reads the split back from a stored row", () => {
    expect(
      usageOf({
        cacheReadTokens: 0,
        cacheWrite1hTokens: 400,
        cacheWriteTokens: 1000,
        inputTokens: 1,
        outputTokens: 1,
        totalTokens: 1002,
      })?.cacheWrite1hTokens
    ).toBe(400);
  });
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
});

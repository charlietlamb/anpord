import { Schema } from "effect";
import type { HarnessUsage } from "./harness-event";

/* Every published rate is quoted per million tokens, so the arithmetic below
   divides by this once rather than each caller carrying the zeroes. */
const PER = 1_000_000;

/**
 * What a model charges, in dollars per million tokens.
 *
 * Cache reads are an order of magnitude cheaper than fresh input and cache
 * writes slightly dearer, which is the whole reason a cached run costs a
 * fraction of the first one. A model that publishes no cache rate is charged
 * at the input rate for those tokens, which is what a provider without a
 * cache would have billed anyway.
 */
export const ModelPrice = Schema.Struct({
  cacheRead: Schema.NullOr(Schema.Number),
  cacheWrite: Schema.NullOr(Schema.Number),
  input: Schema.Number,
  output: Schema.Number,
});
export type ModelPrice = typeof ModelPrice.Type;

/**
 * What a run of this shape costs at these rates.
 *
 * An estimate, not a bill: it is our arithmetic over a public price table,
 * and it knows nothing of the discounts, tiers, or minimums an account may
 * actually be on. Shown as such.
 *
 * Anthropic reports cache tokens beside the input rather than inside it, so
 * each count is charged once at its own rate and nothing is subtracted.
 */
export const costOf = (usage: HarnessUsage, price: ModelPrice): number => {
  const input = usage.inputTokens * price.input;
  const output = usage.outputTokens * price.output;
  const read = usage.cacheReadTokens * (price.cacheRead ?? price.input);
  const write = usage.cacheWriteTokens * (price.cacheWrite ?? price.input);

  return (input + output + read + write) / PER;
};

/**
 * The share of input tokens that came from cache.
 *
 * Null rather than zero when a run read no input at all: a rate needs a
 * denominator, and "no tokens" is not "no cache hits". Cache writes count
 * against the rate because they were paid for in full.
 */
export const cacheHitOf = (usage: HarnessUsage): number | null => {
  const served =
    usage.inputTokens + usage.cacheReadTokens + usage.cacheWriteTokens;

  return served === 0 ? null : usage.cacheReadTokens / served;
};

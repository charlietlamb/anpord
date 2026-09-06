import { Schema } from "effect";
import type { HarnessUsage } from "./harness-event";

/* Published rates are quoted per million tokens. */
const PER = 1_000_000;

/* Dollars per million tokens; a model publishing no cache rate is charged at input. */
export const ModelPrice = Schema.Struct({
  cacheRead: Schema.NullOr(Schema.Number),
  cacheWrite: Schema.NullOr(Schema.Number),
  input: Schema.Number,
  output: Schema.Number,
});
export type ModelPrice = typeof ModelPrice.Type;

/* Anthropic reports cache tokens beside the input rather than inside it, so each
   count is charged once at its own rate and nothing is subtracted. */
export const costOf = (usage: HarnessUsage, price: ModelPrice): number => {
  const input = usage.inputTokens * price.input;
  const output = usage.outputTokens * price.output;
  const read = usage.cacheReadTokens * (price.cacheRead ?? price.input);
  const write = usage.cacheWriteTokens * (price.cacheWrite ?? price.input);

  return (input + output + read + write) / PER;
};

/* Null rather than zero with no input read: a rate needs a denominator. */
export const cacheHitOf = (usage: HarnessUsage): number | null => {
  const served =
    usage.inputTokens + usage.cacheReadTokens + usage.cacheWriteTokens;

  return served === 0 ? null : usage.cacheReadTokens / served;
};

import { Schema } from "effect";
import { HarnessEvent } from "./harness-event";

/**
 * The one line a command harness prints that is not an event: what a turn
 * spent. Cache counts default to none and the total to input plus output,
 * so an agent that knows only two numbers can still report them.
 */
export const CommandUsageLine = Schema.Struct({
  _tag: Schema.Literal("Usage"),
  cacheReadTokens: Schema.optional(Schema.Int),
  cacheWriteTokens: Schema.optional(Schema.Int),
  inputTokens: Schema.Int,
  outputTokens: Schema.Int,
  totalTokens: Schema.optional(Schema.Int),
});
export type CommandUsageLine = typeof CommandUsageLine.Type;

/** Every line a command harness may print on stdout and have recorded. */
export const CommandLine = Schema.Union(HarnessEvent, CommandUsageLine);
export type CommandLine = typeof CommandLine.Type;

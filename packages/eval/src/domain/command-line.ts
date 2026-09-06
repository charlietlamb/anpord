import { Schema } from "effect";
import { HarnessEvent } from "./harness-event";

/* The one line that is not an event. Cache counts default to none and the total
   to input plus output, so an agent knowing two numbers can still report them. */
export const CommandUsageLine = Schema.Struct({
  _tag: Schema.Literal("Usage"),
  cacheReadTokens: Schema.optional(Schema.Int),
  cacheWriteTokens: Schema.optional(Schema.Int),
  inputTokens: Schema.Int,
  outputTokens: Schema.Int,
  totalTokens: Schema.optional(Schema.Int),
});
export type CommandUsageLine = typeof CommandUsageLine.Type;

export const CommandLine = Schema.Union(HarnessEvent, CommandUsageLine);
export type CommandLine = typeof CommandLine.Type;

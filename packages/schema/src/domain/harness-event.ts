import { Schema } from "effect";

/* Optional so journals recorded before timing existed still decode; absent
   means unknown, never zero. */
const OccurredAtMillis = Schema.optional(Schema.Number);

/* Harness-reported, not measured: an estimate produced by the code under test. */
export const HarnessUsage = Schema.Struct({
  /* Priced separately from fresh input; a cache read is an order of magnitude cheaper. */
  cacheReadTokens: Schema.Int,
  cacheWriteTokens: Schema.Int,
  /* Recorded at the rates published when it ran, so a later price change cannot
     restate a finished run. */
  costUsd: Schema.optional(Schema.Number),
  inputTokens: Schema.Int,
  outputTokens: Schema.Int,
  totalTokens: Schema.Int,
});
export type HarnessUsage = typeof HarnessUsage.Type;

export const HarnessEvent = Schema.Union(
  Schema.Struct({
    _tag: Schema.Literal("Started"),
    at: OccurredAtMillis,
    model: Schema.String,
    sessionId: Schema.String,
  }),
  Schema.Struct({
    _tag: Schema.Literal("Message"),
    at: OccurredAtMillis,
    role: Schema.Literal("assistant", "user"),
    text: Schema.String,
    /* Per-turn spend; absent for a harness reporting only a running total. */
    usage: Schema.optional(HarnessUsage),
  }),
  Schema.Struct({
    _tag: Schema.Literal("Command"),
    at: OccurredAtMillis,
    command: Schema.String,
    exitCode: Schema.NullOr(Schema.Int),
    output: Schema.String,
    /* The only event a harness reports both ends of; everything else is an instant. */
    startedAt: Schema.optional(Schema.Number),
  }),
  Schema.Struct({
    _tag: Schema.Literal("FileChange"),
    at: OccurredAtMillis,
    paths: Schema.Array(Schema.String),
  }),
  Schema.Struct({
    _tag: Schema.Literal("ToolCall"),
    at: OccurredAtMillis,
    /* Matches a result to its invocation when they arrive as separate events. */
    callId: Schema.NullOr(Schema.String),
    input: Schema.String,
    name: Schema.String,
    output: Schema.optional(Schema.String),
    error: Schema.optional(Schema.String),
    /* Only for a harness that reports both ends of the call. */
    startedAt: Schema.optional(Schema.Number),
    status: Schema.NullOr(Schema.String),
  }),
  Schema.Struct({
    _tag: Schema.Literal("Finished"),
    at: OccurredAtMillis,
    reason: Schema.String,
  })
);
export type HarnessEvent = typeof HarnessEvent.Type;

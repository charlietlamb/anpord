import { Schema } from "effect";

/* Optional throughout, so journals recorded before timing existed still
   decode. Absent means unknown, which is why it is never zero. */
const OccurredAtMillis = Schema.optional(Schema.Number);

/** Token counts a harness reports about itself. Kept optional because a
 * harness may report none, and stored as harness-reported rather than
 * measured: it is an estimate produced by the code under test. */
export const HarnessUsage = Schema.Struct({
  /* Tokens served from the provider's cache, and tokens written to it. Both
     are a share of the input rather than an addition to it, and both are
     priced differently from fresh input -- a cache read is an order of
     magnitude cheaper -- so they are the difference between a run that looks
     expensive and one that is. Zero where a harness reports no cache at all,
     which is not the same as a harness that reported a cache it did not
     use. */
  cacheReadTokens: Schema.Int,
  cacheWriteTokens: Schema.Int,
  /* What this cost at the rates published when it ran, in dollars. Recorded
     rather than derived on read, so a later price change cannot restate what
     a finished run cost. Absent where the model publishes no rate. */
  costUsd: Schema.optional(Schema.Number),
  inputTokens: Schema.Int,
  outputTokens: Schema.Int,
  totalTokens: Schema.Int,
});
export type HarnessUsage = typeof HarnessUsage.Type;

/** The normalised event every harness decodes into. */
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
    /* What this turn alone spent, where the harness said. Absent for a
       harness that reports only a running total, and absent on the user's
       side of the exchange. */
    usage: Schema.optional(HarnessUsage),
  }),
  /* A command the agent ran, with the exit code captured where it still
     exists. This is the column an eval platform reading a tool-call string
     cannot have, and the reason the journal is the instrument rather than the
     harness's own account of itself. */
  Schema.Struct({
    _tag: Schema.Literal("Command"),
    at: OccurredAtMillis,
    command: Schema.String,
    exitCode: Schema.NullOr(Schema.Int),
    output: Schema.String,
    /* The only event a harness reports both ends of. Everything else is an
       instant, and a guessed width drawn like a measured one is the same lie
       as a rate with no denominator. */
    startedAt: Schema.optional(Schema.Number),
  }),
  Schema.Struct({
    _tag: Schema.Literal("FileChange"),
    at: OccurredAtMillis,
    paths: Schema.Array(Schema.String),
  }),
  /** A tool the agent invoked by name, separate from a shell command. */
  Schema.Struct({
    _tag: Schema.Literal("ToolCall"),
    at: OccurredAtMillis,
    /* The harness's own id for the call, so a result can be matched to its
       invocation when they arrive as separate events. */
    callId: Schema.NullOr(Schema.String),
    input: Schema.String,
    name: Schema.String,
    /* When the call began, for a harness that reports both ends of it. A tool
       that ran for a third of a second is a different fact from one that
       returned instantly, and without this both are drawn as the same dot. */
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

/* A count that may not have been written, read as none rather than as zero
   of something. Guards against a `jsonb` value of the wrong shape as well as
   an absent one. */
const countOf = (value: number | undefined) =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

/**
 * Tokens read back from the column they were stored in.
 *
 * A `jsonb` column is whatever was written to it, so the three fields are
 * checked rather than assumed: a row written by an older build with a
 * different shape reports no usage instead of a cost of `undefined`.
 *
 * The cache counts are read the other way round, defaulted rather than
 * required. Every row written before they existed lacks them, and demanding
 * them would report those trials as having no usage at all rather than as
 * having usage whose cache share is unknown.
 */
export const usageOf = (
  value: Record<string, number> | null | undefined
): HarnessUsage | null => {
  /* Loose, so an absent column reads the same as an explicitly null one: the
     strict check crashed on a row whose usage was never written. */
  if (value == null) {
    return null;
  }

  const { inputTokens, outputTokens, totalTokens } = value;

  return typeof inputTokens === "number" &&
    typeof outputTokens === "number" &&
    typeof totalTokens === "number"
    ? {
        cacheReadTokens: countOf(value.cacheReadTokens),
        cacheWriteTokens: countOf(value.cacheWriteTokens),
        /* Absent for a trial whose model had no published rate, and for
           every trial recorded before this was stored. Undefined rather than
           zero: unknown is not free. */
        costUsd:
          typeof value.costUsd === "number" && Number.isFinite(value.costUsd)
            ? value.costUsd
            : undefined,
        inputTokens,
        outputTokens,
        totalTokens,
      }
    : null;
};

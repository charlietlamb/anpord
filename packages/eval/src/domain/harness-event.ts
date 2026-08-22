import { Schema } from "effect";

/* Optional throughout, so journals recorded before timing existed still
   decode. Absent means unknown, which is why it is never zero. */
const OccurredAtMillis = Schema.optional(Schema.Number);

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
    status: Schema.NullOr(Schema.String),
  }),
  Schema.Struct({
    _tag: Schema.Literal("Finished"),
    at: OccurredAtMillis,
    reason: Schema.String,
  })
);
export type HarnessEvent = typeof HarnessEvent.Type;

/** Token counts a harness reports about itself. Kept optional because a
 * harness may report none, and stored as harness-reported rather than
 * measured: it is an estimate produced by the code under test. */
export const HarnessUsage = Schema.Struct({
  inputTokens: Schema.Int,
  outputTokens: Schema.Int,
  totalTokens: Schema.Int,
});
export type HarnessUsage = typeof HarnessUsage.Type;

/* Null rather than epoch zero: unknown is not 1970. */
export const momentOf = (at: number | undefined) =>
  at === undefined ? null : new Date(at);

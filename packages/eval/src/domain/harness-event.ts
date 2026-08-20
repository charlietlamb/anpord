import { Schema } from "effect";

/**
 * The normalised event every harness decodes into.
 *
 * A domain shape rather than part of the port, because the journal, the
 * repository and the report all read it and none of them should depend on how
 * a harness is invoked. Neither harness's own vocabulary escapes its adapter:
 * scoring each by its own instrument would measure two different things, since
 * Codex records exit codes and Claude Code does not.
 */
export const HarnessEvent = Schema.Union(
  Schema.Struct({
    _tag: Schema.Literal("Started"),
    model: Schema.String,
    sessionId: Schema.String,
  }),
  Schema.Struct({
    _tag: Schema.Literal("Message"),
    role: Schema.Literal("assistant", "user"),
    text: Schema.String,
  }),
  /* A command the agent ran, with the exit code captured where it still
     exists. This is the column an eval platform reading a tool-call string
     cannot have, and the reason the journal is the instrument rather than the
     harness's own account of itself. */
  Schema.Struct({
    _tag: Schema.Literal("Command"),
    command: Schema.String,
    exitCode: Schema.NullOr(Schema.Int),
    output: Schema.String,
  }),
  Schema.Struct({
    _tag: Schema.Literal("FileChange"),
    paths: Schema.Array(Schema.String),
  }),
  /* A tool the agent invoked by name, separate from a shell command.
     A real Codex session is mostly these: forty-eight function calls against
     three shell executions in one sampled transcript. Three companies in the
     customer research independently wrote scorers over tool calls, and none
     of them could be expressed against commands alone: PostHog has
     RequiredToolCall and NoToolCall, Onyx has ToolAssertion, DeerFlow has
     forbidden_tool_actions. */
  Schema.Struct({
    _tag: Schema.Literal("ToolCall"),
    /* The harness's own id for the call, so a result can be matched to its
       invocation when they arrive as separate events. */
    callId: Schema.NullOr(Schema.String),
    input: Schema.String,
    name: Schema.String,
    status: Schema.NullOr(Schema.String),
  }),
  Schema.Struct({
    _tag: Schema.Literal("Finished"),
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

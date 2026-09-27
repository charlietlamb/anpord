import { Schema } from "effect";
import { EvalCosts } from "./eval-costs";
import { EvalValidations } from "./eval-validations";
import { EvalHarness as Harness } from "./harness";

export const EvalHarness = Harness;
export type EvalHarness = typeof EvalHarness.Type;

export const EvalTrialStatus = Schema.Literal(
  "queued",
  "running",
  "passed",
  "failed",
  "void"
);
export type EvalTrialStatus = typeof EvalTrialStatus.Type;

const OccurredAtMillis = Schema.NullOr(Schema.Number);

export const EvalUsage = Schema.Struct({
  cacheReadTokens: Schema.Int,
  cacheWriteTokens: Schema.Int,
  costUsd: Schema.optional(Schema.NullOr(Schema.Number)),
  inputTokens: Schema.Int,
  outputTokens: Schema.Int,
  totalTokens: Schema.Int,
}).annotations({
  description: "Token usage reported by the harness.",
  identifier: "EvalUsage",
});
export type EvalUsage = typeof EvalUsage.Type;

export const EvalJournalEntry = Schema.Union(
  Schema.Struct({
    _tag: Schema.Literal("command"),
    command: Schema.String,
    exitCode: Schema.NullOr(Schema.Int),
    finishedAtMillis: OccurredAtMillis,
    output: Schema.String,
    outputTruncated: Schema.optional(Schema.Boolean),
    startedAtMillis: OccurredAtMillis,
  }),
  Schema.Struct({
    _tag: Schema.Literal("message"),
    finishedAtMillis: OccurredAtMillis,
    role: Schema.optionalWith(Schema.Literal("assistant", "user"), {
      default: () => "assistant" as const,
    }),
    text: Schema.String,
    usage: Schema.optional(Schema.NullOr(EvalUsage)),
  }),
  Schema.Struct({
    _tag: Schema.Literal("toolCall"),
    finishedAtMillis: OccurredAtMillis,
    input: Schema.optional(Schema.String),
    name: Schema.String,
    output: Schema.optional(Schema.String),
    error: Schema.optional(Schema.String),
    outputTruncated: Schema.optional(Schema.Boolean),
    inputTruncated: Schema.optional(Schema.Boolean),
    errorTruncated: Schema.optional(Schema.Boolean),
    startedAtMillis: Schema.optional(OccurredAtMillis),
    status: Schema.NullOr(Schema.String),
  }),
  Schema.Struct({
    _tag: Schema.Literal("fileChange"),
    finishedAtMillis: OccurredAtMillis,
    paths: Schema.Array(Schema.String),
  })
).annotations({
  description: "A normalized event recorded from the harness trajectory.",
  identifier: "EvalJournalEntry",
});
export type EvalJournalEntry = typeof EvalJournalEntry.Type;

export const EvalVerifyStep = Schema.Struct({
  command: Schema.String,
  exitCode: Schema.Int,
}).annotations({
  description:
    "One condition of the verifier, and how it exited. Only the steps that ran are listed: the script stops at the first failure.",
  identifier: "EvalVerifyStep",
});
export type EvalVerifyStep = typeof EvalVerifyStep.Type;

export const EvalArtifact = Schema.Struct({
  path: Schema.String,
  content: Schema.String,
  byteSize: Schema.Int.pipe(Schema.nonNegative()),
  sha256: Schema.String.pipe(Schema.pattern(/^[a-f0-9]{64}$/)),
});
export type EvalArtifact = typeof EvalArtifact.Type;

export const EvalArtifactMetadata = EvalArtifact.omit("content");
export type EvalArtifactMetadata = typeof EvalArtifactMetadata.Type;

export const EvalArtifactRequest = Schema.Struct({
  path: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(512)),
  sha256: Schema.String.pipe(Schema.pattern(/^[a-f0-9]{64}$/)),
  trialId: Schema.String,
});
export type EvalArtifactRequest = typeof EvalArtifactRequest.Type;

export const EvalTrial = Schema.Struct({
  artifacts: Schema.Array(EvalArtifactMetadata),
  commands: Schema.Int,
  costs: Schema.NullOr(EvalCosts),
  exitCode: Schema.Int,
  failedCommands: Schema.Int,
  failure: Schema.optionalWith(
    Schema.NullOr(Schema.String).annotations({
      description:
        "Why the trial stopped before it could be scored, such as running past its time limit or a setup step that failed. Null when it was scored.",
    }),
    { default: () => null }
  ),
  filesChanged: Schema.Array(Schema.String),
  id: Schema.String,
  modelMs: Schema.Int,
  ordinal: Schema.Int,
  sandboxId: Schema.NullOr(Schema.String),
  sandboxMs: Schema.Int,
  status: EvalTrialStatus,
  timed: Schema.Boolean,
  trajectory: Schema.Array(EvalJournalEntry),
  usage: Schema.NullOr(EvalUsage),
  validations: EvalValidations,
  verifySteps: Schema.Array(EvalVerifyStep),
  voidFields: Schema.Array(Schema.String),
}).annotations({
  description: "One attempt of a run, in its own sandbox.",
  identifier: "EvalTrial",
});
export type EvalTrial = typeof EvalTrial.Type;

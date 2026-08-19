import { Schema } from "effect";

export const EvalProvider = Schema.Literal("daytona", "e2b");
export type EvalProvider = typeof EvalProvider.Type;

export const EvalHarness = Schema.Literal("codex");
export type EvalHarness = typeof EvalHarness.Type;

/** `void` is a status of its own and never a flavour of `failed`. A trial
 * whose commands never executed says nothing about the agent, and scoring it
 * as a failure lets a broken provider report a clean pass rate. */
export const EvalTrialStatus = Schema.Literal(
  "queued",
  "running",
  "passed",
  "failed",
  "void",
  "exceeded"
);
export type EvalTrialStatus = typeof EvalTrialStatus.Type;

export const EvalRunStatus = Schema.Literal("running", "finished", "failed");
export type EvalRunStatus = typeof EvalRunStatus.Type;

/** The task under test. Sent whole rather than referenced by id, because the
 * playground's purpose is editing it and running it again immediately. */
export const EvalTaskInput = Schema.Struct({
  files: Schema.Record({ key: Schema.String, value: Schema.String }),
  name: Schema.String,
  prompt: Schema.String,
  setupCommand: Schema.NullOr(Schema.String),
  verifyCommand: Schema.String,
});
export type EvalTaskInput = typeof EvalTaskInput.Type;

export const StartEvalRequest = Schema.Struct({
  harness: EvalHarness,
  model: Schema.String,
  provider: EvalProvider,
  task: EvalTaskInput,
  trials: Schema.Int.pipe(Schema.between(1, 10)),
});
export type StartEvalRequest = typeof StartEvalRequest.Type;

/** A command the agent ran, with the exit code captured where it still
 * exists. This is the column an eval platform reading a tool-call string
 * cannot have. */
export const EvalCommand = Schema.Struct({
  command: Schema.String,
  exitCode: Schema.NullOr(Schema.Int),
  output: Schema.String,
});
export type EvalCommand = typeof EvalCommand.Type;

export const EvalTrial = Schema.Struct({
  commands: Schema.Int,
  failedCommands: Schema.Int,
  filesChanged: Schema.Array(Schema.String),
  journal: Schema.Array(EvalCommand),
  modelMs: Schema.Int,
  ordinal: Schema.Int,
  passed: Schema.Boolean,
  sandboxId: Schema.NullOr(Schema.String),
  sandboxMs: Schema.Int,
  status: EvalTrialStatus,
  voidFields: Schema.Array(Schema.String),
});
export type EvalTrial = typeof EvalTrial.Type;

/** The reportable unit. A rate alone reads as a grade, so the spread travels
 * with it: ten of ten in nine to eleven commands and seven of ten in nine to
 * forty-one are different findings. */
export const EvalDistribution = Schema.Struct({
  commandMax: Schema.Int,
  commandMedian: Schema.Number,
  commandMin: Schema.Int,
  deterministic: Schema.Boolean,
  failed: Schema.Int,
  passRate: Schema.Number,
  passed: Schema.Int,
  scored: Schema.Int,
  trials: Schema.Int,
  voided: Schema.Int,
});
export type EvalDistribution = typeof EvalDistribution.Type;

export const EvalRun = Schema.Struct({
  cellKey: Schema.String,
  distribution: Schema.NullOr(EvalDistribution),
  failure: Schema.NullOr(Schema.String),
  finishedAt: Schema.NullOr(Schema.DateTimeUtc),
  harness: EvalHarness,
  id: Schema.String,
  model: Schema.String,
  provider: EvalProvider,
  startedAt: Schema.DateTimeUtc,
  status: EvalRunStatus,
  taskName: Schema.String,
  trials: Schema.Array(EvalTrial),
});
export type EvalRun = typeof EvalRun.Type;

export const EvalRunSummary = Schema.Struct({
  distribution: Schema.NullOr(EvalDistribution),
  harness: EvalHarness,
  id: Schema.String,
  model: Schema.String,
  provider: EvalProvider,
  startedAt: Schema.DateTimeUtc,
  status: EvalRunStatus,
  taskName: Schema.String,
});
export type EvalRunSummary = typeof EvalRunSummary.Type;

export const StartedEval = Schema.Struct({ id: Schema.String });
export type StartedEval = typeof StartedEval.Type;

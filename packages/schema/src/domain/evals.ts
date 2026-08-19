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

/**
 * Where the code the agent works on comes from.
 *
 * A union rather than a file map, because the three answers are genuinely
 * different situations: nothing to start from, a repository to clone, or
 * fixture files written in. A playground that only offers the third is a file
 * editor wearing a playground's name.
 */
export const EvalSource = Schema.Union(
  Schema.Struct({ kind: Schema.Literal("empty") }),
  Schema.Struct({
    kind: Schema.Literal("repo"),
    ref: Schema.NullOr(Schema.String),
    url: Schema.String,
  }),
  Schema.Struct({
    files: Schema.Record({ key: Schema.String, value: Schema.String }),
    kind: Schema.Literal("files"),
  })
);
export type EvalSource = typeof EvalSource.Type;

/**
 * One case the agent attempts: a dataset row in the sense Braintrust means
 * it, where `goal` is the input and `verify` is the ground truth.
 *
 * A run carries its cases inline. With one case that is a single evaluation,
 * which is what a playground with no dataset does; with many it is a dataset,
 * and nothing downstream can tell the difference. Shaping the request around
 * a single task is what would make datasets a rewrite rather than an addition.
 */
export const EvalCase = Schema.Struct({
  goal: Schema.String,
  metadata: Schema.Record({ key: Schema.String, value: Schema.String }),
  name: Schema.String,
  setup: Schema.NullOr(Schema.String),
  source: EvalSource,
  verify: Schema.String,
});
export type EvalCase = typeof EvalCase.Type;

/** A column in the grid: one harness, one model, one sandbox. A second task
 * is how a customer compares Codex against another harness on the same
 * cases, and it is the reason anyone keeps using this. */
export const EvalTask = Schema.Struct({
  harness: EvalHarness,
  model: Schema.String,
  provider: EvalProvider,
});
export type EvalTask = typeof EvalTask.Type;

export const StartEvalRequest = Schema.Struct({
  cases: Schema.Array(EvalCase).pipe(Schema.minItems(1)),
  /** Resolved per case, so one prompt applies to every row rather than being
   * retyped for each. `{{goal}}` is the case's own goal. */
  prompt: Schema.String,
  tasks: Schema.Array(EvalTask).pipe(Schema.minItems(1)),
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

/** One square of the grid: what one task did on one case. */
export const EvalCell = Schema.Struct({
  caseName: Schema.String,
  distribution: Schema.NullOr(EvalDistribution),
  status: EvalRunStatus,
  taskIndex: Schema.Int,
  trials: Schema.Array(EvalTrial),
});
export type EvalCell = typeof EvalCell.Type;

export const EvalRun = Schema.Struct({
  cases: Schema.Array(Schema.String),
  cells: Schema.Array(EvalCell),
  failure: Schema.NullOr(Schema.String),
  finishedAt: Schema.NullOr(Schema.DateTimeUtc),
  id: Schema.String,
  startedAt: Schema.DateTimeUtc,
  status: EvalRunStatus,
  tasks: Schema.Array(EvalTask),
});
export type EvalRun = typeof EvalRun.Type;

export const EvalRunSummary = Schema.Struct({
  caseCount: Schema.Int,
  id: Schema.String,
  startedAt: Schema.DateTimeUtc,
  status: EvalRunStatus,
  taskCount: Schema.Int,
});
export type EvalRunSummary = typeof EvalRunSummary.Type;

export const StartedEval = Schema.Struct({ id: Schema.String });
export type StartedEval = typeof StartedEval.Type;

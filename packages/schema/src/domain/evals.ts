import { Schema } from "effect";

/** `local` runs on the server itself: a real shell in a temporary
 * directory, so somebody can try the product before handing over cloud
 * credentials. It offers no isolation and is not for untrusted code. */
export const EvalProvider = Schema.Literal("daytona", "e2b", "local");
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
  /** Null for a case whose format carries no verifier. Its trials are void,
   * never passed: a case nothing decides has produced no evidence. */
  verify: Schema.NullOr(Schema.String),
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

/** A tool the agent invoked by name. Separate from a command, because three
 * of the companies this was built for score tool calls and none of their
 * assertions can be expressed against shell alone. */
export const EvalToolCall = Schema.Struct({
  name: Schema.String,
  status: Schema.NullOr(Schema.String),
});
export type EvalToolCall = typeof EvalToolCall.Type;

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
  /** The trajectory, in order. What "did it call the right tool" is answered
   * from, and what no score alone can carry. */
  toolCalls: Schema.Array(EvalToolCall),
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

/** Whether a cell moved against the reading its organization accepted.
 *
 * `incomparable` is a first-class verdict rather than a missing number. A
 * provider outage leaves a cell with nothing scored, and reporting that as a
 * pass rate of zero would announce a collapse that never happened. */
export const EvalVerdict = Schema.Literal(
  "improved",
  "incomparable",
  "regressed",
  "unchanged"
);
export type EvalVerdict = typeof EvalVerdict.Type;

export const EvalComparison = Schema.Struct({
  baselinePassRate: Schema.Number,
  candidatePassRate: Schema.Number,
  delta: Schema.Number,
  /** True when the pass rate held but the cell stopped agreeing with itself.
   * An agent that became unreliable without becoming wrong is a regression no
   * single score can express. */
  determinismLost: Schema.Boolean,
  reason: Schema.NullOr(Schema.String),
  verdict: EvalVerdict,
});
export type EvalComparison = typeof EvalComparison.Type;

/** One square of the grid: what one task did on one case. */
export const EvalCell = Schema.Struct({
  caseName: Schema.String,
  /** The identity a baseline is keyed by: task, harness, harness version,
   * model and provider hashed together. A client needs it to promote this
   * reading or to ask for its history. */
  cellKey: Schema.NullOr(Schema.String),
  comparison: Schema.NullOr(EvalComparison),
  distribution: Schema.NullOr(EvalDistribution),
  internalId: Schema.NullOr(Schema.String),
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

export const PromoteBaselineRequest = Schema.Struct({
  cellInternalId: Schema.String,
});
export type PromoteBaselineRequest = typeof PromoteBaselineRequest.Type;

export const PromotedBaseline = Schema.Struct({
  cellKey: Schema.String,
  passRate: Schema.Number,
  promotedAt: Schema.DateTimeUtc,
});
export type PromotedBaseline = typeof PromotedBaseline.Type;

/** A saved workbench: the cases, columns and prompt somebody is working on,
 * kept between visits. Distinct from a run, which is a fact about one moment
 * and never moves. */
export const PlaygroundCaseView = Schema.Struct({
  goal: Schema.String,
  name: Schema.String,
  setup: Schema.NullOr(Schema.String),
  source: EvalSource,
  /** Null for an imported case. It runs and reports and never claims a pass,
   * rather than having a verifier invented for it. */
  verify: Schema.NullOr(Schema.String),
});

export const PlaygroundColumnView = Schema.Struct({
  harness: EvalHarness,
  model: Schema.String,
  provider: EvalProvider,
});

export const PlaygroundConfigView = Schema.Struct({
  cases: Schema.Array(PlaygroundCaseView),
  columns: Schema.Array(PlaygroundColumnView),
  prompt: Schema.String,
  trials: Schema.Int.pipe(Schema.between(1, 10)),
});

export const PlaygroundView = Schema.Struct({
  config: PlaygroundConfigView,
  id: Schema.String,
  lastRunId: Schema.NullOr(Schema.String),
  name: Schema.String,
  /** Why this playground cannot run yet, empty when it can. The same answer
   * disables a control and rejects a request, so it travels with the object
   * rather than being rediscovered by the client. */
  problems: Schema.Array(Schema.String),
  /** Cases that will run but cannot pass. Reported so nobody reads their
   * verdict as evidence. */
  ungated: Schema.Array(Schema.String),
  updatedAt: Schema.DateTimeUtc,
});
export type PlaygroundView = typeof PlaygroundView.Type;

export const CreatePlaygroundRequest = Schema.Struct({
  name: Schema.String.pipe(Schema.minLength(1)),
});

export const SavePlaygroundRequest = Schema.Struct({
  config: PlaygroundConfigView,
  name: Schema.String.pipe(Schema.minLength(1)),
});

export const StartedEval = Schema.Struct({ id: Schema.String });
export type StartedEval = typeof StartedEval.Type;

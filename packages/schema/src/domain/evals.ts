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
  /* Pinned, and part of the column identity rather than a detail of it: the
     cell key hashes both, so a column naming the harness without its version
     compares against something else. */
  harnessVersion: Schema.String,
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

/* Null rather than zero: a harness reporting no timing and a provider
   answering in one piece both leave this unknown, and 1970 is not a time
   anything happened. */
const OccurredAtMillis = Schema.NullOr(Schema.Number);

/**
 * One entry of the trajectory, in the order it happened.
 *
 * A tagged union rather than a list of commands: what customers ask is what
 * the agent did between two commands. Only a command carries a span, so
 * everything else draws as a marker rather than a guessed width.
 */
export const EvalJournalEntry = Schema.Union(
  Schema.Struct({
    _tag: Schema.Literal("command"),
    command: Schema.String,
    exitCode: Schema.NullOr(Schema.Int),
    finishedAtMillis: OccurredAtMillis,
    output: Schema.String,
    startedAtMillis: OccurredAtMillis,
  }),
  Schema.Struct({
    _tag: Schema.Literal("message"),
    finishedAtMillis: OccurredAtMillis,
    text: Schema.String,
  }),
  Schema.Struct({
    _tag: Schema.Literal("toolCall"),
    finishedAtMillis: OccurredAtMillis,
    name: Schema.String,
    status: Schema.NullOr(Schema.String),
  }),
  Schema.Struct({
    _tag: Schema.Literal("fileChange"),
    finishedAtMillis: OccurredAtMillis,
    paths: Schema.Array(Schema.String),
  })
);
export type EvalJournalEntry = typeof EvalJournalEntry.Type;

/** Tokens the model spent, as the harness reported them. */
export const EvalUsage = Schema.Struct({
  inputTokens: Schema.Int,
  outputTokens: Schema.Int,
  totalTokens: Schema.Int,
});
export type EvalUsage = typeof EvalUsage.Type;

export const EvalTrial = Schema.Struct({
  commands: Schema.Int,
  /* -1 is a trial nothing decided: no evidence, rather than a failure. */
  exitCode: Schema.Int,
  failedCommands: Schema.Int,
  filesChanged: Schema.Array(Schema.String),
  modelMs: Schema.Int,
  ordinal: Schema.Int,
  passed: Schema.Boolean,
  sandboxId: Schema.NullOr(Schema.String),
  sandboxMs: Schema.Int,
  status: EvalTrialStatus,
  /* False when the sandbox answered in one piece, so every entry shares a
     moment and the trajectory is an order rather than a timeline. */
  timed: Schema.Boolean,
  trajectory: Schema.Array(EvalJournalEntry),
  usage: Schema.NullOr(EvalUsage),
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
/** How a case was set up and how it was judged.
 *
 * Travels with the cell rather than behind its own request: it is small, it
 * never changes once a run has started, and a screen that has to fetch the
 * rubric separately will render a verdict before it arrives. */
export const EvalSetup = Schema.Struct({
  prompt: Schema.String,
  repoRef: Schema.NullOr(Schema.String),
  repoUrl: Schema.NullOr(Schema.String),
  setupCommand: Schema.NullOr(Schema.String),
  /* Absent means nothing checked the work, which is not the same as a check
     that passed. */
  verifyCommand: Schema.NullOr(Schema.String),
  workspace: Schema.String,
});
export type EvalSetup = typeof EvalSetup.Type;

export const EvalCell = Schema.Struct({
  caseName: Schema.String,
  /** The identity a baseline is keyed by: task, harness, harness version,
   * model and provider hashed together. A client needs it to promote this
   * reading or to ask for its history. */
  cellKey: Schema.NullOr(Schema.String),
  comparison: Schema.NullOr(EvalComparison),
  distribution: Schema.NullOr(EvalDistribution),
  internalId: Schema.NullOr(Schema.String),
  /* Null on a cell the run planned but never recorded, which has no task
     behind it to describe. */
  setup: Schema.NullOr(EvalSetup),
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

/** A run as the list screen needs it.
 *
 * The outcome travels with the summary rather than behind a request per row:
 * a list that shows a pass rate had to fetch every run in full to render one
 * column, which is a query per row on the busiest screen.
 *
 * `scored` and `voided` are both here because a rate without its denominator
 * is how a provider outage reads as a perfect score. */
export const EvalRunSummary = Schema.Struct({
  caseCount: Schema.Int,
  commandMax: Schema.NullOr(Schema.Int),
  commandMin: Schema.NullOr(Schema.Int),
  failure: Schema.NullOr(Schema.String),
  finishedAt: Schema.NullOr(Schema.DateTimeUtc),
  id: Schema.String,
  /** The first task's name, which is what a person recognises a run by. */
  name: Schema.NullOr(Schema.String),
  passed: Schema.Int,
  scored: Schema.Int,
  startedAt: Schema.DateTimeUtc,
  status: EvalRunStatus,
  taskCount: Schema.Int,
  voided: Schema.Int,
});
export type EvalRunSummary = typeof EvalRunSummary.Type;

/**
 * One past reading of a cell, newest first.
 *
 * What makes a verdict legible: `unchanged` says less than `unchanged since
 * 14 Aug`, and it turns promotion into a choice between readings rather than
 * a blind accept of whatever ran last.
 */
export const EvalCellHistoryEntry = Schema.Struct({
  distribution: EvalDistribution,
  finishedAt: Schema.NullOr(Schema.DateTimeUtc),
  internalId: Schema.String,
  runId: Schema.String,
});
export type EvalCellHistoryEntry = typeof EvalCellHistoryEntry.Type;

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

/**
 * A playground as a form holds it, before it is saved.
 *
 * The same fields as `PlaygroundConfigView` with two differences that only a
 * form needs: the arrays are mutable, because adding and removing a row is
 * what a form does to them, and the messages are written for a person rather
 * than a decoder.
 *
 * Effect Schema is a Standard Schema, which is the interface TanStack Form
 * validates against, so this is the validator as well as the contract. One
 * definition, no adapter, and nothing to keep in step.
 */
export const EvalDraftCase = Schema.Struct({
  goal: Schema.String.pipe(
    Schema.minLength(1),
    Schema.annotations({ message: () => "Say what the agent should do." })
  ),
  name: Schema.String.pipe(
    Schema.minLength(1),
    Schema.annotations({ message: () => "Name this case." })
  ),
  setup: Schema.NullOr(Schema.String),
  source: EvalSource,
  verify: Schema.NullOr(Schema.String),
});
export type EvalDraftCase = typeof EvalDraftCase.Type;

export const EvalDraft = Schema.Struct({
  cases: Schema.mutable(Schema.Array(EvalDraftCase)).pipe(
    Schema.minItems(1),
    Schema.annotations({ message: () => "Add at least one case." })
  ),
  models: Schema.mutable(Schema.Array(Schema.String)).pipe(
    Schema.minItems(1),
    Schema.annotations({ message: () => "Choose at least one model." })
  ),
  name: Schema.String,
  prompt: Schema.String,
  providers: Schema.mutable(Schema.Array(EvalProvider)).pipe(
    Schema.minItems(1),
    Schema.annotations({ message: () => "Choose at least one sandbox." })
  ),
  trials: Schema.Int.pipe(
    Schema.between(1, 10),
    Schema.annotations({ message: () => "Run between 1 and 10 trials." })
  ),
});
export type EvalDraft = typeof EvalDraft.Type;

/** Models and sandboxes are chosen as two lists and crossed into columns,
 * because a column is every pairing of them and asking for the pairs one at a
 * time is asking a person to do multiplication by hand. */
export const columnsOfDraft = (draft: {
  readonly models: readonly string[];
  readonly providers: readonly EvalProvider[];
}): readonly { harness: "codex"; model: string; provider: EvalProvider }[] =>
  draft.providers.flatMap((provider) =>
    draft.models.map((model) => ({
      harness: "codex" as const,
      model,
      provider,
    }))
  );

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

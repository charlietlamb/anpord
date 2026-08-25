import { Schema } from "effect";
import { CredentialBindings, CredentialSelections } from "./credentials";

export const EvalProvider = Schema.Literal(
  "daytona",
  "e2b",
  "upstash",
  "modal",
  "cloudflare",
  "vercel",
  "local"
);
export type EvalProvider = typeof EvalProvider.Type;

export const HostedEvalProvider = EvalProvider.pipe(
  Schema.pickLiteral(
    "daytona",
    "e2b",
    "upstash",
    "modal",
    "cloudflare",
    "vercel"
  )
);
export type HostedEvalProvider = typeof HostedEvalProvider.Type;
export const HOSTED_EVAL_PROVIDERS = HostedEvalProvider.literals;

export const EvalHarness = Schema.Literal(
  "codex",
  "opencode",
  "pi",
  "fx",
  "claude",
  "gemini",
  "qwen",
  "cursor"
);
export type EvalHarness = typeof EvalHarness.Type;

export const HarnessCapabilities = Schema.Struct({
  commands: Schema.Boolean,
  fileChanges: Schema.Boolean,
  streaming: Schema.Boolean,
  usage: Schema.Boolean,
});
export type HarnessCapabilities = typeof HarnessCapabilities.Type;

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
).annotations({
  description: "The workspace available to the harness before setup runs.",
  identifier: "EvalSource",
});
export type EvalSource = typeof EvalSource.Type;

export const EvalCase = Schema.Struct({
  goal: Schema.String,
  name: Schema.String,
  setup: Schema.NullOr(Schema.String),
  source: EvalSource,

  verify: Schema.NullOr(Schema.String),
});
export type EvalCase = typeof EvalCase.Type;

export const EvalTask = Schema.Struct({
  harness: EvalHarness,

  harnessVersion: Schema.String,
  model: Schema.String,
  provider: EvalProvider,
}).annotations({
  description: "The harness, installed version, model, and sandbox for a cell.",
  identifier: "EvalTask",
});
export type EvalTask = typeof EvalTask.Type;

export const EvalTaskRequest = Schema.Struct({
  credentials: Schema.optional(CredentialBindings),
  harness: EvalHarness,
  model: Schema.String,
  provider: EvalProvider,
});
export type EvalTaskRequest = typeof EvalTaskRequest.Type;

export const StartEvalRequest = Schema.Struct({
  cases: Schema.Array(EvalCase).pipe(Schema.minItems(1)),

  prompt: Schema.String,
  tasks: Schema.Array(EvalTaskRequest).pipe(Schema.minItems(1)),
  trials: Schema.Int.pipe(Schema.between(1, 10)),
});
export type StartEvalRequest = typeof StartEvalRequest.Type;

const OccurredAtMillis = Schema.NullOr(Schema.Number);

export const EvalUsage = Schema.Struct({
  /* A share of the input rather than an addition to it, and priced far
     cheaper, so these are what separate an expensive run from a repeat of
     one. Zero where the harness reports no cache: unreported, not unused. */
  cacheReadTokens: Schema.Int,
  cacheWriteTokens: Schema.Int,
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
    startedAtMillis: OccurredAtMillis,
  }),
  Schema.Struct({
    _tag: Schema.Literal("message"),
    finishedAtMillis: OccurredAtMillis,
    text: Schema.String,
    /* What this turn spent, where the harness reported it per turn rather
       than only as a running total. Null is unknown, not free. */
    usage: Schema.optional(Schema.NullOr(EvalUsage)),
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

export const EvalTrial = Schema.Struct({
  commands: Schema.Int,

  exitCode: Schema.Int,
  failedCommands: Schema.Int,
  filesChanged: Schema.Array(Schema.String),
  modelMs: Schema.Int,
  ordinal: Schema.Int,
  passed: Schema.Boolean,
  sandboxId: Schema.NullOr(Schema.String),
  sandboxMs: Schema.Int,
  status: EvalTrialStatus,

  timed: Schema.Boolean,
  trajectory: Schema.Array(EvalJournalEntry),
  usage: Schema.NullOr(EvalUsage),
  verifySteps: Schema.Array(EvalVerifyStep),
  voidFields: Schema.Array(Schema.String),
}).annotations({
  description: "One sandbox attempt for a grid cell.",
  identifier: "EvalTrial",
});
export type EvalTrial = typeof EvalTrial.Type;

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
}).annotations({
  description: "The scored outcome across all trials in a cell.",
  identifier: "EvalDistribution",
});
export type EvalDistribution = typeof EvalDistribution.Type;

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

  determinismLost: Schema.Boolean,
  reason: Schema.NullOr(Schema.String),
  verdict: EvalVerdict,
}).annotations({
  description: "The cell result compared with its most recent baseline.",
  identifier: "EvalComparison",
});
export type EvalComparison = typeof EvalComparison.Type;

export const EvalSetup = Schema.Struct({
  prompt: Schema.String,
  repoRef: Schema.NullOr(Schema.String),
  repoUrl: Schema.NullOr(Schema.String),
  setupCommand: Schema.NullOr(Schema.String),

  verifyCommand: Schema.NullOr(Schema.String),
  workspace: Schema.String,
}).annotations({
  description: "The prompt, workspace, setup, and verifier used by a cell.",
  identifier: "EvalSetup",
});
export type EvalSetup = typeof EvalSetup.Type;

export const EvalCell = Schema.Struct({
  caseName: Schema.String,

  cellKey: Schema.NullOr(Schema.String),
  comparison: Schema.NullOr(EvalComparison),
  distribution: Schema.NullOr(EvalDistribution),
  internalId: Schema.NullOr(Schema.String),

  setup: Schema.NullOr(EvalSetup),
  status: EvalRunStatus,
  taskIndex: Schema.Int,
  trials: Schema.Array(EvalTrial),
}).annotations({
  description: "One case and task combination in an eval grid.",
  identifier: "EvalCell",
});

const EvalTimestamp = Schema.DateTimeUtc.annotations({
  description: "An ISO-8601 timestamp in UTC.",
  identifier: "EvalTimestamp",
  jsonSchema: { format: "date-time" },
});
export type EvalCell = typeof EvalCell.Type;

export const EvalRun = Schema.Struct({
  cases: Schema.Array(Schema.String),
  cells: Schema.Array(EvalCell),
  failure: Schema.NullOr(Schema.String),
  finishedAt: Schema.NullOr(EvalTimestamp),
  id: Schema.String,
  startedAt: EvalTimestamp,
  status: EvalRunStatus,
  tasks: Schema.Array(EvalTask),
}).annotations({
  description: "A complete eval run with its cells and trials.",
  identifier: "EvalRun",
});
export type EvalRun = typeof EvalRun.Type;

export const EvalRunSummary = Schema.Struct({
  caseCount: Schema.Int,

  columns: Schema.Array(EvalTask),
  commandMax: Schema.NullOr(Schema.Int),
  commandMin: Schema.NullOr(Schema.Int),
  failure: Schema.NullOr(Schema.String),
  finishedAt: Schema.NullOr(EvalTimestamp),
  id: Schema.String,

  name: Schema.NullOr(Schema.String),
  passed: Schema.Int,
  scored: Schema.Int,
  startedAt: EvalTimestamp,
  status: EvalRunStatus,
  taskCount: Schema.Int,
  voided: Schema.Int,
}).annotations({
  description: "A compact eval run returned by the run list.",
  identifier: "EvalRunSummary",
});
export type EvalRunSummary = typeof EvalRunSummary.Type;

/**
 * Where a listing left off.
 *
 * A timestamp alone is not a position -- two runs started in the same
 * millisecond share one -- so the id travels with it and breaks the tie.
 */
/** How many runs a page holds.
 *
 * Shared so a caller can turn a total into a number of pages, and so a list
 * waiting to load can stand exactly as tall as the one that replaces it,
 * without either guessing what the server chose. */
export const EVAL_PAGE_SIZE = 20;

export const EvalPageCursor = Schema.Struct({
  id: Schema.String,
  startedAtMillis: Schema.Int,
});
export type EvalPageCursor = typeof EvalPageCursor.Type;

/** One page of runs. `next` is null at the end rather than an empty cursor, so
 * a caller stops because there is nothing more rather than because a fetch
 * came back empty. */
export const EvalRunPage = Schema.Struct({
  next: Schema.NullOr(EvalPageCursor),
  runs: Schema.Array(EvalRunSummary),
  /** Every run the organization has, so a listing can say how far it goes
   * rather than only whether there is more. */
  total: Schema.Int,
});
export type EvalRunPage = typeof EvalRunPage.Type;

export const EvalCellHistoryEntry = Schema.Struct({
  distribution: EvalDistribution,
  finishedAt: Schema.NullOr(EvalTimestamp),
  internalId: Schema.String,
  runId: Schema.String,
  /* Every reading of a cell holds the same case, setup and variant -- the cell
     key hashes all three -- so the trials are the only thing that differs
     between them, and they belong in one table rather than one page each. */
  trials: Schema.Array(EvalTrial),
}).annotations({
  description: "A previous scored result for the same cell identity.",
  identifier: "EvalCellHistoryEntry",
});
export type EvalCellHistoryEntry = typeof EvalCellHistoryEntry.Type;

export const PlaygroundCaseView = Schema.Struct({
  goal: Schema.String,
  name: Schema.String,
  setup: Schema.NullOr(Schema.String),
  source: EvalSource,

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
  connections: Schema.optionalWith(CredentialSelections, {
    default: () => ({}),
  }),
  prompt: Schema.String,
  trials: Schema.Int.pipe(Schema.between(1, 10)),
});

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

export const EvalAgent = Schema.Struct({
  harness: EvalHarness,
  model: Schema.String,
});
export type EvalAgent = typeof EvalAgent.Type;

export const EvalDraft = Schema.Struct({
  agents: Schema.mutable(Schema.Array(EvalAgent)).pipe(
    Schema.minItems(1),
    Schema.annotations({ message: () => "Choose at least one agent." })
  ),
  cases: Schema.mutable(Schema.Array(EvalDraftCase)).pipe(
    Schema.minItems(1),
    Schema.annotations({ message: () => "Add at least one case." })
  ),
  connections: CredentialSelections,
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

export const columnsOfDraft = (draft: {
  readonly agents: readonly EvalAgent[];
  readonly providers: readonly EvalProvider[];
}): readonly {
  harness: EvalHarness;
  model: string;
  provider: EvalProvider;
}[] =>
  draft.agents.flatMap(({ harness, model }) =>
    draft.providers.map((provider) => ({ harness, model, provider }))
  );

export const draftOfConfig = (
  config: typeof PlaygroundConfigView.Type,
  name: string
): EvalDraft => ({
  agents: [
    ...new Map(
      config.columns.map(({ harness, model }) => [
        `${harness}\0${model}`,
        { harness, model },
      ])
    ).values(),
  ],
  cases: config.cases.map((subject) => ({
    goal: subject.goal,
    name: subject.name,
    setup: subject.setup,
    source: subject.source,
    verify: subject.verify,
  })),
  connections: config.connections,
  name,
  prompt: config.prompt,
  providers: [...new Set(config.columns.map((column) => column.provider))],
  trials: config.trials,
});

export const PlaygroundView = Schema.Struct({
  config: PlaygroundConfigView,
  id: Schema.String,
  lastRunId: Schema.NullOr(Schema.String),
  name: Schema.String,

  problems: Schema.Array(Schema.String),

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

export const StartedEval = Schema.Struct({ id: Schema.String }).annotations({
  description: "The id of an eval run accepted for background execution.",
  identifier: "StartedEval",
});

export const RerunCellRequest = Schema.Struct({
  trials: Schema.Int.pipe(Schema.between(1, 10)),
});
export type RerunCellRequest = typeof RerunCellRequest.Type;
export type StartedEval = typeof StartedEval.Type;

export const CatalogueModel = Schema.Struct({
  displayName: Schema.String,
  id: Schema.String,
  summary: Schema.NullOr(Schema.String),
  /* Carried rather than parsed out of the id, because a harness that takes a
     bare slug has no provider in it to parse. */
  vendor: Schema.NullOr(Schema.String),
}).annotations({
  description: "A model available to the installed harness.",
  identifier: "CatalogueModel",
});
export type CatalogueModel = typeof CatalogueModel.Type;

export const ModelCatalogue = Schema.Struct({
  harness: EvalHarness,
  models: Schema.Array(CatalogueModel),
  /* What the query left out, so a picker can say a search is narrowed rather
     than letting a reader believe twenty is all there is. */
  total: Schema.Int,
}).annotations({
  description: "Models available to the installed harness.",
  identifier: "ModelCatalogue",
});
export type ModelCatalogue = typeof ModelCatalogue.Type;

import { Schema } from "effect";
import { CredentialBindings, CredentialSelections } from "./credentials";
import {
  HarnessProfile,
  PROFILE_HARNESS_RULE,
  profileFitsHarness,
} from "./harness-profile";

/* Sandboxes an eval can run in. There is no local option: it ran a shell on
   whatever machine the server was on, which is fine on a laptop and an open
   shell on a shared deployment, and a provider nobody can name is a provider
   nobody can reach. The adapter survives as a conformance target for the
   sandbox contract in tests, where the machine is the one running them. */
export const EvalProvider = Schema.Literal(
  "daytona",
  "e2b",
  "upstash",
  "modal",
  "cloudflare",
  "vercel"
);
export type EvalProvider = typeof EvalProvider.Type;

export const EVAL_PROVIDERS = EvalProvider.literals;

/* `command` is a customer's own process run inside the sandbox from a
   profile's install and run steps, emitting the event schema on stdout. */
export const EvalHarness = Schema.Literal(
  "codex",
  "opencode",
  "pi",
  "fx",
  "claude",
  "gemini",
  "qwen",
  "cursor",
  "command"
);
export type EvalHarness = typeof EvalHarness.Type;

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
    /* Checked here rather than at the clone: an empty url reached the sandbox,
       failed there, and reported a broken run instead of a form that was not
       finished. */
    url: Schema.String.pipe(
      Schema.minLength(1),
      Schema.annotations({ message: () => "Give the repository a URL." })
    ),
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

export const EvalValidator = Schema.Struct({
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100)),
  source: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(1_000_000)),
}).annotations({
  description: "A bundled TypeScript validator and its exported function name.",
  identifier: "EvalValidator",
});
export type EvalValidator = typeof EvalValidator.Type;

export const EvalPrepare = Schema.Struct({
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100)),
  source: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(1_000_000)),
}).annotations({
  description:
    "A bundled TypeScript workspace setup and its exported function name.",
  identifier: "EvalPrepare",
});
export type EvalPrepare = typeof EvalPrepare.Type;

export const EvalPrepareValue = Schema.Record({
  key: Schema.String,
  value: Schema.Unknown,
}).annotations({
  description: "What a workspace setup returned, handed to the validator.",
  identifier: "EvalPrepareValue",
});
export type EvalPrepareValue = typeof EvalPrepareValue.Type;

export const EvalVariables = Schema.Record({
  key: Schema.String,
  value: Schema.String,
}).annotations({
  description:
    "Values for the placeholders the run prompt names, such as {{task}}.",
  identifier: "EvalVariables",
});
export type EvalVariables = typeof EvalVariables.Type;

/**
 * A directory worth keeping between runs of a case.
 *
 * Declared on the case rather than reported by its prepare, because a restore
 * happens before the prepare runs and so cannot be told where to look by it.
 * The shape CI caches use, for the same reason.
 */
export const CaseCache = Schema.Struct({
  key: Schema.String.pipe(Schema.minLength(1)),
  /* Relative, and refused otherwise: it is joined onto the workspace before
     anything is written, so one that climbs out writes somewhere else. */
  path: Schema.String.pipe(
    Schema.minLength(1),
    Schema.filter(
      (value) => !(value.startsWith("/") || value.split("/").includes("..")),
      { message: () => "a cache path must stay inside the workspace" }
    )
  ),
}).annotations({ identifier: "CaseCache" });
export type CaseCache = typeof CaseCache.Type;

export const EvalCase = Schema.Struct({
  cache: Schema.optional(CaseCache),
  name: Schema.String,
  prepare: Schema.NullOr(EvalPrepare),
  source: EvalSource,
  variables: Schema.optionalWith(EvalVariables, { default: () => ({}) }),

  validator: Schema.optionalWith(Schema.NullOr(EvalValidator), {
    default: () => null,
  }),
  verify: Schema.NullOr(Schema.String),
});
export type EvalCase = typeof EvalCase.Type;

export const EvalTaskProfile = Schema.Struct({
  name: Schema.String,
  /* The content hash, compared across readings the way the harness version
     is: an edited profile is a new version on the same cell. */
  version: Schema.String,
}).annotations({
  description: "The profile a cell's harness ran under, by name and version.",
  identifier: "EvalTaskProfile",
});
export type EvalTaskProfile = typeof EvalTaskProfile.Type;

export const EvalTask = Schema.Struct({
  harness: EvalHarness,

  harnessVersion: Schema.String,
  model: Schema.String,
  profile: Schema.optional(Schema.NullOr(EvalTaskProfile)),
  provider: EvalProvider,
}).annotations({
  description:
    "The harness, installed version, profile, model, and sandbox for a cell.",
  identifier: "EvalTask",
});
export type EvalTask = typeof EvalTask.Type;

export const EvalTaskRequest = Schema.Struct({
  credentials: Schema.optional(CredentialBindings),
  harness: EvalHarness,
  model: Schema.String,
  profile: Schema.optional(HarnessProfile),
  provider: EvalProvider,
}).pipe(
  Schema.filter(profileFitsHarness, { message: () => PROFILE_HARNESS_RULE })
);
export type EvalTaskRequest = typeof EvalTaskRequest.Type;

export const EvalName = Schema.String.pipe(
  Schema.minLength(1),
  Schema.maxLength(100)
);
export type EvalName = typeof EvalName.Type;

export const StartEvalRequest = Schema.Struct({
  cases: Schema.Array(EvalCase).pipe(Schema.minItems(1)),
  name: Schema.optional(EvalName),
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
  /* An estimate in dollars, priced at the rates published when the run
     happened, not a bill: it knows nothing of the discounts or tiers an
     account is actually on. Absent where the model publishes no rate. */
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
    /* Null for a harness that reports only when a call returned, which is
       most of them: such a call is drawn as the instant it is known to be
       rather than as a guessed width. */
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

/**
 * How much of a cost is known, and on what basis.
 *
 * The distinction is the point: a public-rate calculation is not an invoice, a
 * subscription's marginal price is not zero, and a cost the platform absorbs
 * is not one the customer paid. Collapsing any of those into a number produces
 * a total that reads as authoritative and is not.
 */
export const CostClassification = Schema.Literal(
  "actual",
  "allocated",
  "estimate",
  "included",
  "managed",
  "unknown"
);
export type CostClassification = typeof CostClassification.Type;

export const CostComponentName = Schema.Literal(
  "harness",
  "model",
  "platform",
  "sandbox"
);
export type CostComponentName = typeof CostComponentName.Type;

export const EvalCostComponent = Schema.Struct({
  classification: CostClassification,
  component: CostComponentName,
  /* What this layer measured, which differs by layer: a rate snapshot means
     nothing to the platform, and eval units mean nothing to the model. */
  detail: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
  explanation: Schema.String,
  source: Schema.String,
  /* Null where there is no amount to report, never zero: zero reads as free
     and sums as free, and "we did not price this" is not free. */
  usd: Schema.NullOr(Schema.Number),
}).annotations({
  description: "What one layer of a trial cost, and how far that is known.",
  identifier: "EvalCostComponent",
});
export type EvalCostComponent = typeof EvalCostComponent.Type;

/**
 * What a run, case, or trial cost, kept apart by how it is known.
 *
 * No single total, deliberately. Adding an estimate to an actual charge and an
 * allocated share produces a number that means none of the three.
 */
export const EvalCosts = Schema.Struct({
  allocatedUsd: Schema.Number,
  components: Schema.Array(EvalCostComponent),
  estimatedEquivalentUsd: Schema.Number,
  /* True when something could not be priced at all. Included and managed are
     known states rather than missing ones, so they do not raise it: a flag
     that is always on says nothing. */
  incomplete: Schema.Boolean,
  knownActualUsd: Schema.Number,
}).annotations({
  description: "Cost by component, kept apart by classification.",
  identifier: "EvalCosts",
});
export type EvalCosts = typeof EvalCosts.Type;

export const EvalTrial = Schema.Struct({
  commands: Schema.Int,
  costs: Schema.NullOr(EvalCosts),
  prepared: Schema.NullOr(EvalPrepareValue),

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
  /* The harness version is the one dimension a baseline and its candidate
     can differ on, because everything else is in the cell key. Both are
     named so a verdict can say what changed. */
  baselineHarnessVersion: Schema.String,
  baselinePassRate: Schema.Number,
  /* Null where the cell ran without a profile; the profile name is in the
     cell key, so only its version can move between two readings. */
  baselineProfileVersion: Schema.NullOr(Schema.String),
  candidateHarnessVersion: Schema.String,
  candidatePassRate: Schema.Number,
  candidateProfileVersion: Schema.NullOr(Schema.String),
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
  prepareName: Schema.NullOr(Schema.String),

  validatorName: Schema.NullOr(Schema.String),
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
  costs: Schema.NullOr(EvalCosts),
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
  costs: Schema.NullOr(EvalCosts),
  failure: Schema.NullOr(Schema.String),
  finishedAt: Schema.NullOr(EvalTimestamp),
  id: Schema.String,
  name: Schema.NullOr(EvalName),
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
  firstCaseName: Schema.NullOr(Schema.String),
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
  /* The one thing about a reading's variant that can differ from the last:
     harness, model and provider are in the cell key, the version is not. */
  harnessVersion: Schema.String,
  internalId: Schema.String,
  profileVersion: Schema.NullOr(Schema.String),
  runId: Schema.String,
  /* Every reading of a cell holds the same case, setup, harness, model,
     provider and profile name, so the trials and the two versions are the
     only things that differ between them, and they belong in one table
     rather than one page each. */
  trials: Schema.Array(EvalTrial),
}).annotations({
  description: "A previous scored result for the same cell identity.",
  identifier: "EvalCellHistoryEntry",
});
export type EvalCellHistoryEntry = typeof EvalCellHistoryEntry.Type;

export const PlaygroundCaseView = Schema.Struct({
  name: Schema.String,
  setup: Schema.NullOr(Schema.String),
  source: EvalSource,
  variables: Schema.optionalWith(EvalVariables, { default: () => ({}) }),

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
  name: Schema.String.pipe(
    Schema.minLength(1),
    Schema.annotations({ message: () => "Name this case." })
  ),
  setup: Schema.NullOr(Schema.String),
  source: EvalSource,
  variables: EvalVariables.pipe(
    Schema.filter(
      (values) => Object.values(values).some((value) => value.trim() !== ""),
      { message: () => "Say what the agent should do." }
    )
  ),
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
    name: subject.name,
    setup: subject.setup,
    source: subject.source,
    variables: subject.variables,
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

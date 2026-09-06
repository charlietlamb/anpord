import { Schema } from "effect";
import { CredentialBindings, CredentialSelections } from "./credentials";
import { EvalJudge, EvalJudgment } from "./eval-judges";
import { EvalSourceFiles } from "./eval-source-files";
import { EvalHarness as Harness } from "./harness";

export const EvalHarness = Harness;
export type EvalHarness = typeof EvalHarness.Type;

import {
  EvalCaseName,
  EvalPrompt,
  EvalVariableValue,
  EvalVerify,
} from "./eval-limits";
import {
  MAX_START_CASES,
  MAX_START_TASKS,
  MAX_START_TRIALS,
} from "./eval-quota";
import {
  HarnessProfile,
  PROFILE_HARNESS_RULE,
  profileFitsHarness,
} from "./harness-profile";

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

export const EvalTrialStatus = Schema.Literal(
  "queued",
  "running",
  "passed",
  "failed",
  "void"
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

export const EvalCodeValidator = Schema.Struct({
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100)),
  source: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(1_000_000)),
});

export const EvalValidator = Schema.Union(
  EvalCodeValidator.pipe(
    Schema.extend(
      Schema.Struct({ sourceFiles: Schema.optional(EvalSourceFiles) })
    )
  ),
  Schema.Struct({
    kind: Schema.Literal("judged"),
    name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100)),
    checks: Schema.Array(EvalCodeValidator).pipe(Schema.maxItems(20)),
    judges: Schema.Array(EvalJudge).pipe(
      Schema.minItems(1),
      Schema.maxItems(20)
    ),
    sourceFiles: Schema.optional(EvalSourceFiles),
  })
).annotations({
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
  value: EvalVariableValue,
}).annotations({
  description:
    "Values for the placeholders the run prompt names, such as {{task}}.",
  identifier: "EvalVariables",
});
export type EvalVariables = typeof EvalVariables.Type;

/* Declared on the case, not reported by its prepare: a restore runs before the prepare. */
export const CaseCache = Schema.Struct({
  key: Schema.String.pipe(Schema.minLength(1)),
  /* Joined onto the workspace, so a path that climbs out writes elsewhere. */
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
  name: EvalCaseName,
  prepare: Schema.NullOr(EvalPrepare),
  source: EvalSource,
  variables: Schema.optionalWith(EvalVariables, { default: () => ({}) }),

  validator: Schema.optionalWith(Schema.NullOr(EvalValidator), {
    default: () => null,
  }),
  verify: Schema.NullOr(EvalVerify),
});
export type EvalCase = typeof EvalCase.Type;

export const EvalTaskProfile = Schema.Struct({
  name: Schema.String,
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
  cases: Schema.Array(EvalCase).pipe(
    Schema.minItems(1),
    Schema.maxItems(MAX_START_CASES)
  ),
  name: Schema.optional(EvalName),
  prompt: EvalPrompt,
  tasks: Schema.Array(EvalTaskRequest).pipe(
    Schema.minItems(1),
    Schema.maxItems(MAX_START_TASKS)
  ),
  trials: Schema.Int.pipe(Schema.between(1, MAX_START_TRIALS)),
});
export type StartEvalRequest = typeof StartEvalRequest.Type;

const OccurredAtMillis = Schema.NullOr(Schema.Number);

export const EvalUsage = Schema.Struct({
  cacheReadTokens: Schema.Int,
  cacheWriteTokens: Schema.Int,
  /* Priced at published rates, not billed: no account discounts or tiers. */
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
    /* Null where the harness reports only completion, which is most of them. */
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

/* Kept apart because collapsing an estimate, a charge and an absorbed cost into one number reads as authoritative and is not. */
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
  "judge",
  "harness",
  "model",
  "platform",
  "sandbox"
);
export type CostComponentName = typeof CostComponentName.Type;

export const EvalCostComponent = Schema.Struct({
  classification: CostClassification,
  component: CostComponentName,
  detail: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
  explanation: Schema.String,
  source: Schema.String,
  /* Null, never zero: zero sums as free and unpriced is not free. */
  usd: Schema.NullOr(Schema.Number),
}).annotations({
  description: "What one layer of a trial cost, and how far that is known.",
  identifier: "EvalCostComponent",
});
export type EvalCostComponent = typeof EvalCostComponent.Type;

/* No single total, deliberately: summing across classifications means none of them. */
export const EvalCosts = Schema.Struct({
  allocatedUsd: Schema.Number,
  components: Schema.Array(EvalCostComponent),
  estimatedEquivalentUsd: Schema.Number,
  /* Raised only by unknown; included and managed are known states. */
  incomplete: Schema.Boolean,
  knownActualUsd: Schema.Number,
}).annotations({
  description: "Cost by component, kept apart by classification.",
  identifier: "EvalCosts",
});
export type EvalCosts = typeof EvalCosts.Type;

export const EvalTrial = Schema.Struct({
  judgments: Schema.optional(Schema.Array(EvalJudgment)),
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
  baselineHarnessVersion: Schema.String,
  baselinePassRate: Schema.Number,
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
  validatorFiles: Schema.optional(EvalSourceFiles),
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

/* Shared with clients so a pending list can reserve the height of the one replacing it. */
export const EVAL_PAGE_SIZE = 20;

export const EvalPageCursor = Schema.Struct({
  id: Schema.String,
  startedAtMillis: Schema.Int,
});
export type EvalPageCursor = typeof EvalPageCursor.Type;

/* `next` is null at the end, so a caller stops on exhaustion rather than an empty fetch. */
export const EvalRunPage = Schema.Struct({
  next: Schema.NullOr(EvalPageCursor),
  runs: Schema.Array(EvalRunSummary),
  total: Schema.Int,
});
export type EvalRunPage = typeof EvalRunPage.Type;

export const EvalCellHistoryEntry = Schema.Struct({
  distribution: EvalDistribution,
  finishedAt: Schema.NullOr(EvalTimestamp),
  harnessVersion: Schema.String,
  internalId: Schema.String,
  profileVersion: Schema.NullOr(Schema.String),
  runId: Schema.String,
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
  vendor: Schema.NullOr(Schema.String),
}).annotations({
  description: "A model available to the installed harness.",
  identifier: "CatalogueModel",
});
export type CatalogueModel = typeof CatalogueModel.Type;

export const ModelCatalogue = Schema.Struct({
  harness: EvalHarness,
  models: Schema.Array(CatalogueModel),
  total: Schema.Int,
}).annotations({
  description: "Models available to the installed harness.",
  identifier: "ModelCatalogue",
});
export type ModelCatalogue = typeof ModelCatalogue.Type;

import { Schema } from "effect";
import { CredentialBindings } from "./credentials";
import { EvalJudge } from "./eval-judges";
import { EvalSourceFiles } from "./eval-source-files";
import { EvalTrigger } from "./eval-trigger";
import { EvalUser } from "./eval-turns";
import { EvalValidations } from "./eval-validations";
import { EvalHarness as Harness } from "./harness";

export const EvalHarness = Harness;
export type EvalHarness = typeof EvalHarness.Type;

import {
  EvalCaseId,
  EvalCaseName,
  EvalCaseTags,
  EvalPrompt,
  EvalSuiteId,
  EvalSuiteName,
  EvalVariableValue,
  EvalVerify,
} from "./eval-limits";
import {
  MAX_START_CASES,
  MAX_START_TRIALS,
  MAX_START_VARIANTS,
} from "./eval-quota";
import {
  HarnessProfile,
  PROFILE_HARNESS_RULE,
  profileFitsHarness,
} from "./harness-profile";

export const EvalSandbox = Schema.Literal(
  "daytona",
  "e2b",
  "upstash",
  "modal",
  "cloudflare",
  "vercel",
  "local"
);
export type EvalSandbox = typeof EvalSandbox.Type;

export const EVAL_SANDBOXES = EvalSandbox.literals;

export const HOSTED_SANDBOXES = EVAL_SANDBOXES.filter(
  (sandbox) => sandbox !== "local"
);

export const DEFAULT_SANDBOX: EvalSandbox = "e2b";

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
  capture: Schema.optional(Schema.Boolean),
  manifest: Schema.optional(
    Schema.Array(
      Schema.Struct({
        index: Schema.NonNegativeInt,
        name: Schema.String.pipe(Schema.maxLength(200)),
      })
    ).pipe(
      Schema.minItems(1),
      Schema.maxItems(20),
      Schema.filter(
        (checks) =>
          new Set(checks.map((check) => check.index)).size === checks.length,
        { message: () => "Validator indices must be unique" }
      )
    )
  ),
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
    capture: Schema.optional(Schema.Boolean),
    name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100)),
    checks: Schema.Array(EvalCodeValidator).pipe(Schema.maxItems(20)),
    judges: Schema.Array(EvalJudge).pipe(
      Schema.minItems(1),
      Schema.maxItems(20)
    ),
    sourceFiles: Schema.optional(EvalSourceFiles),
  }).pipe(
    Schema.filter(
      (validator) =>
        validator.checks.reduce(
          (total, check) => total + (check.manifest?.length ?? 1),
          0
        ) <= 20,
      { message: () => "At most 20 code validators are supported" }
    )
  )
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

export const CaseCache = Schema.Struct({
  key: Schema.String.pipe(Schema.minLength(1)),
  path: Schema.String.pipe(
    Schema.minLength(1),
    Schema.filter(
      (value) => !(value.startsWith("/") || value.split("/").includes("..")),
      { message: () => "a cache path must stay inside the workspace" }
    ),
    Schema.filter(
      (value) => {
        const directory = value
          .split("/")
          .find((part) => part !== "" && part !== ".");
        return directory !== undefined && directory !== ".anpord";
      },
      {
        message: () =>
          "a cache must name a subdirectory outside the reserved .anpord runtime",
      }
    )
  ),
}).annotations({ identifier: "CaseCache" });
export type CaseCache = typeof CaseCache.Type;

export const EvalCase = Schema.Struct({
  cache: Schema.optional(CaseCache),
  id: EvalCaseId,
  name: EvalCaseName,
  user: Schema.optionalWith(Schema.NullOr(EvalUser), { default: () => null }),
  prepare: Schema.optionalWith(Schema.NullOr(EvalPrepare), {
    default: () => null,
  }),
  source: Schema.optionalWith(EvalSource, {
    default: () => ({ kind: "empty" as const }),
  }),
  tags: Schema.optionalWith(EvalCaseTags, { default: () => [] }),
  variables: Schema.optionalWith(EvalVariables, { default: () => ({}) }),

  validator: Schema.optionalWith(Schema.NullOr(EvalValidator), {
    default: () => null,
  }),
  verify: Schema.optionalWith(Schema.NullOr(EvalVerify), {
    default: () => null,
  }),
});
export type EvalCase = typeof EvalCase.Type;

export const EvalVariantRequest = Schema.Struct({
  credentials: Schema.optional(CredentialBindings),
  harness: EvalHarness,
  model: Schema.String.pipe(Schema.minLength(1)),
  profile: Schema.optional(HarnessProfile),
  sandbox: Schema.optionalWith(EvalSandbox, { default: () => DEFAULT_SANDBOX }),
})
  .pipe(
    Schema.filter(profileFitsHarness, { message: () => PROFILE_HARNESS_RULE })
  )
  .annotations({
    description: `A harness and model, with an optional sandbox and an optional profile layered on the harness. ${PROFILE_HARNESS_RULE}`,
    identifier: "EvalVariantRequest",
  });
export type EvalVariantRequest = typeof EvalVariantRequest.Type;

export const EvalSuiteRequest = Schema.Struct({
  id: EvalSuiteId,
  name: EvalSuiteName,
  prompt: EvalPrompt,
}).annotations({
  description: "The suite the cases belong to, and the prompt they share.",
  identifier: "EvalSuiteRequest",
});
export type EvalSuiteRequest = typeof EvalSuiteRequest.Type;

export const StartBatchRequest = Schema.Struct({
  cases: Schema.Array(EvalCase).pipe(
    Schema.minItems(1),
    Schema.maxItems(MAX_START_CASES)
  ),
  local: Schema.optionalWith(Schema.Boolean, { default: () => false }),
  suite: EvalSuiteRequest,
  trials: Schema.Int.pipe(Schema.between(1, MAX_START_TRIALS)),
  trigger: Schema.optionalWith(Schema.NullOr(EvalTrigger), {
    default: () => null,
  }),
  variants: Schema.Array(EvalVariantRequest).pipe(
    Schema.minItems(1),
    Schema.maxItems(MAX_START_VARIANTS)
  ),
}).annotations({
  description:
    "Run every case of a suite on every variant, each as many times as trials.",
  identifier: "StartBatchRequest",
});
export type StartBatchRequest = typeof StartBatchRequest.Type;

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
  usd: Schema.NullOr(Schema.Number),
}).annotations({
  description: "What one layer of a trial cost, and how far that is known.",
  identifier: "EvalCostComponent",
});
export type EvalCostComponent = typeof EvalCostComponent.Type;

export const EvalCosts = Schema.Struct({
  allocatedUsd: Schema.Number,
  components: Schema.Array(EvalCostComponent),
  estimatedEquivalentUsd: Schema.Number,
  incomplete: Schema.Boolean,
  knownActualUsd: Schema.Number,
}).annotations({
  description: "Cost by component, kept apart by classification.",
  identifier: "EvalCosts",
});
export type EvalCosts = typeof EvalCosts.Type;

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
  description: "The scored outcome across the trials of a run.",
  identifier: "EvalDistribution",
});
export type EvalDistribution = typeof EvalDistribution.Type;

export const EvalSuite = Schema.Struct({
  id: EvalSuiteId,
  name: Schema.String,
}).annotations({
  description: "A group of cases that share a prompt and setup.",
  identifier: "EvalSuite",
});
export type EvalSuite = typeof EvalSuite.Type;

export const EvalVariant = Schema.Struct({
  harness: EvalHarness,
  id: Schema.String,
  model: Schema.String,
  profile: Schema.NullOr(Schema.String),
  sandbox: EvalSandbox,
  userModel: Schema.NullOr(Schema.String),
}).annotations({
  description:
    "The harness, model, sandbox and profile a case runs on. A case has one variant per combination it has run on.",
  identifier: "EvalVariant",
});
export type EvalVariant = typeof EvalVariant.Type;

export const EvalSetup = Schema.Struct({
  prepare: Schema.NullOr(Schema.String),
  prompt: Schema.String,
  source: EvalSource,
  validator: Schema.NullOr(Schema.String),
  validatorFiles: Schema.optional(EvalSourceFiles),
  verify: Schema.NullOr(Schema.String),
}).annotations({
  description: "The prompt, workspace, setup and verifier a run used.",
  identifier: "EvalSetup",
});
export type EvalSetup = typeof EvalSetup.Type;

const EvalTimestamp = Schema.DateTimeUtc.annotations({
  description: "An ISO-8601 timestamp in UTC.",
  identifier: "EvalTimestamp",
  jsonSchema: { format: "date-time" },
});

export const EvalRun = Schema.Struct({
  batchId: Schema.String,
  case: Schema.Struct({ id: EvalCaseId, name: Schema.String }),
  costs: Schema.NullOr(EvalCosts),
  definitionHash: Schema.String,
  distribution: EvalDistribution,
  finishedAt: Schema.NullOr(EvalTimestamp),
  harnessVersion: Schema.String,
  id: Schema.String,
  local: Schema.Boolean,
  profileVersion: Schema.NullOr(Schema.String),
  setup: EvalSetup,
  startedAt: EvalTimestamp,
  status: EvalRunStatus,
  suite: EvalSuite,
  trials: Schema.Array(EvalTrial),
  trigger: Schema.NullOr(EvalTrigger),
  variant: EvalVariant,
}).annotations({
  description: "One case run on one variant, with its trials.",
  identifier: "EvalRun",
});
export type EvalRun = typeof EvalRun.Type;

export const EvalBatch = Schema.Struct({
  costs: Schema.NullOr(EvalCosts),
  failure: Schema.NullOr(Schema.String),
  finishedAt: Schema.NullOr(EvalTimestamp),
  id: Schema.String,
  local: Schema.Boolean,
  runs: Schema.Array(EvalRun),
  startedAt: EvalTimestamp,
  status: EvalRunStatus,
  trigger: Schema.NullOr(EvalTrigger),
}).annotations({
  description: "Runs started together, such as every variant of a suite.",
  identifier: "EvalBatch",
});
export type EvalBatch = typeof EvalBatch.Type;

export const EvalBatchSummary = Schema.Struct({
  cases: Schema.Int,
  failure: Schema.NullOr(Schema.String),
  finishedAt: Schema.NullOr(EvalTimestamp),
  id: Schema.String,
  passed: Schema.Int,
  runs: Schema.Int,
  scored: Schema.Int,
  startedAt: EvalTimestamp,
  status: EvalRunStatus,
  trigger: Schema.NullOr(EvalTrigger),
  voided: Schema.Int,
}).annotations({
  description: "A batch as a list shows it.",
  identifier: "EvalBatchSummary",
});
export type EvalBatchSummary = typeof EvalBatchSummary.Type;

export const StartedBatch = Schema.Struct({
  id: Schema.String,
  runs: Schema.Array(
    Schema.Struct({
      caseId: EvalCaseId,
      id: Schema.String,
      variantIndex: Schema.Int,
    })
  ),
}).annotations({
  description:
    "The batch started, and the run it holds for each case and variant.",
  identifier: "StartedBatch",
});
export type StartedBatch = typeof StartedBatch.Type;

export const EVAL_PAGE_SIZE = 20;

export const EvalPageCursor = Schema.Struct({
  id: Schema.String,
  startedAtMillis: Schema.Int,
});
export type EvalPageCursor = typeof EvalPageCursor.Type;

export const EvalBatchPage = Schema.Struct({
  batches: Schema.Array(EvalBatchSummary),
  next: Schema.NullOr(EvalPageCursor),
  total: Schema.Int,
});
export type EvalBatchPage = typeof EvalBatchPage.Type;

export const EvalVariantResult = Schema.Struct({
  distribution: EvalDistribution,
  lastRunAt: EvalTimestamp,
  lastRunId: Schema.String,
  runs: Schema.Int,
  variant: EvalVariant,
}).annotations({
  description: "A variant of a case and how its newest run went.",
  identifier: "EvalVariantResult",
});
export type EvalVariantResult = typeof EvalVariantResult.Type;

export const EvalCaseSummary = Schema.Struct({
  id: EvalCaseId,
  lastRunAt: EvalTimestamp,
  name: Schema.String,
  suite: EvalSuite,
  tags: Schema.Array(Schema.String),
  variants: Schema.Array(EvalVariantResult),
}).annotations({
  description: "A case as the list shows it, with each variant's newest run.",
  identifier: "EvalCaseSummary",
});
export type EvalCaseSummary = typeof EvalCaseSummary.Type;

export const EvalCasePage = Schema.Struct({
  cases: Schema.Array(EvalCaseSummary),
  next: Schema.NullOr(EvalPageCursor),
  suites: Schema.Array(EvalSuite),
  tags: Schema.Array(Schema.String),
}).annotations({
  description: "Cases, and every suite and tag they fall under.",
  identifier: "EvalCasePage",
});
export type EvalCasePage = typeof EvalCasePage.Type;

export const EvalCaseVersion = Schema.Struct({
  author: Schema.NullOr(Schema.String),
  changes: Schema.Array(Schema.String),
  createdAt: EvalTimestamp,
  definitionHash: Schema.String,
}).annotations({
  description: "One definition a case held, who wrote it, and what it changed.",
  identifier: "EvalCaseVersion",
});
export type EvalCaseVersion = typeof EvalCaseVersion.Type;

export const EvalCaseDetail = Schema.Struct({
  id: EvalCaseId,
  name: Schema.String,
  setup: EvalSetup,
  suite: EvalSuite,
  tags: Schema.Array(Schema.String),
  variants: Schema.Array(EvalVariantResult),
  versions: Schema.Array(EvalCaseVersion),
}).annotations({
  description:
    "A case, how its newest version is set up, and each variant it has run on.",
  identifier: "EvalCaseDetail",
});
export type EvalCaseDetail = typeof EvalCaseDetail.Type;

export const RUN_PAGE_SIZE = 20;

export const EvalRunPage = Schema.Struct({
  page: Schema.Int,
  pageSize: Schema.Int,
  runs: Schema.Array(EvalRun),
  total: Schema.Int,
}).annotations({
  description: "One page of a case's runs, newest first.",
  identifier: "EvalRunPage",
});
export type EvalRunPage = typeof EvalRunPage.Type;

export const EvalTrialAddress = Schema.Struct({
  batchId: Schema.String,
  caseId: Schema.String,
  ordinal: Schema.Int,
  runId: Schema.String,
  trialId: Schema.String,
}).annotations({
  description: "Where a trial sits: its case, batch, run and ordinal.",
  identifier: "EvalTrialAddress",
});
export type EvalTrialAddress = typeof EvalTrialAddress.Type;

export const batchTagOf = (batchId: string) => `batch_${batchId}`;

export const BatchSubscription = Schema.Struct({
  expiresAtMillis: Schema.Number,
  tag: Schema.String,
  token: Schema.String,
}).annotations({
  description: "A scoped, read-only token for watching one batch in real time.",
  identifier: "BatchSubscription",
});
export type BatchSubscription = typeof BatchSubscription.Type;

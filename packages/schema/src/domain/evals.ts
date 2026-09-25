import { Schema } from "effect";
import { EvalSandbox, EvalSource } from "./eval-definition";
import { EvalCaseId, EvalSuiteId } from "./eval-limits";
import { EvalSourceFiles } from "./eval-source-files";
import { EvalTrigger } from "./eval-trigger";
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

export const EvalRunStatus = Schema.Literal("running", "finished", "failed");
export type EvalRunStatus = typeof EvalRunStatus.Type;

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

export const EvalTally = Schema.Struct({
  passed: Schema.Int,
  scored: Schema.Int,
}).annotations({
  description:
    "How many trials were scored across a group, and how many passed.",
  identifier: "EvalTally",
});
export type EvalTally = typeof EvalTally.Type;

export const tallyOf = (
  distributions: readonly Pick<EvalDistribution, "passed" | "scored">[]
): EvalTally =>
  distributions.reduce(
    (total, entry) => ({
      passed: total.passed + entry.passed,
      scored: total.scored + entry.scored,
    }),
    { passed: 0, scored: 0 }
  );

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
      variantId: Schema.String,
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
  /* Carried only by the name sort, whose ordering tuple is (name, id). */
  name: Schema.optional(Schema.String),
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

const EvalSuiteFacts = {
  cases: Schema.Int,
  id: EvalSuiteId,
  lastRunAt: Schema.NullOr(EvalTimestamp),
  name: Schema.String,
  tally: EvalTally,
  variants: Schema.Int,
};

export const EvalSuiteSummary = Schema.Struct(EvalSuiteFacts).annotations({
  description:
    "A suite as the list shows it, counted across the cases it holds.",
  identifier: "EvalSuiteSummary",
});
export type EvalSuiteSummary = typeof EvalSuiteSummary.Type;

export const EvalSuitePage = Schema.Struct({
  next: Schema.NullOr(EvalPageCursor),
  suites: Schema.Array(EvalSuiteSummary),
}).annotations({
  description: "Suites, most recently active first.",
  identifier: "EvalSuitePage",
});
export type EvalSuitePage = typeof EvalSuitePage.Type;

export const EvalSuiteSetup = Schema.Struct({
  prompt: Schema.NullOr(Schema.String),
  source: Schema.NullOr(EvalSource),
}).annotations({
  description:
    "The prompt and workspace a suite's cases share, before a case overrides either. Null where the suite last ran before they were recorded.",
  identifier: "EvalSuiteSetup",
});
export type EvalSuiteSetup = typeof EvalSuiteSetup.Type;

export const EvalSuiteDetail = Schema.Struct({
  ...EvalSuiteFacts,
  setup: EvalSuiteSetup,
  tags: Schema.Array(Schema.String),
}).annotations({
  description: "A suite, the setup its cases share, and every tag they carry.",
  identifier: "EvalSuiteDetail",
});
export type EvalSuiteDetail = typeof EvalSuiteDetail.Type;

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

import { Schema } from "effect";
import { EvalSource } from "./eval-definition";
import { EvalCaseId, EvalSuiteId } from "./eval-limits";
import {
  EvalBatchSummary,
  EvalDistribution,
  EvalRun,
  EvalSetup,
  EvalSuite,
  EvalTally,
  EvalTimestamp,
  EvalVariant,
} from "./evals";

export const EVAL_PAGE_SIZE = 20;

export const CaseSort = Schema.Literal("recent", "name");
export type CaseSort = typeof CaseSort.Type;

export const CaseOrder = Schema.Literal("asc", "desc");
export type CaseOrder = typeof CaseOrder.Type;

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

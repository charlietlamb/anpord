import type {
  EvalCaseDetail,
  EvalCasePage,
  EvalDistribution,
  EvalRun,
  EvalRunPage,
  EvalSuiteDetail,
  EvalSuitePage,
  EvalSuiteSummary,
  EvalTrial,
  EvalVariant,
  EvalVariantResult,
} from "@anpord/schema/domain/evals";
import { DateTime } from "effect";
import { placeholders, placeholderText } from "@/lib/placeholders";

const EPOCH = DateTime.unsafeMake(0);

const DISTRIBUTION: EvalDistribution = {
  commandMax: 0,
  commandMedian: 0,
  commandMin: 0,
  deterministic: true,
  failed: 0,
  passRate: 1,
  passed: 1,
  scored: 1,
  trials: 1,
  voided: 0,
};

const VARIANT: EvalVariant = {
  harness: "codex",
  id: "placeholder-variant",
  model: "gpt-5-codex",
  profile: null,
  sandbox: "e2b",
  userModel: null,
};

const SUITE = { id: "placeholder", name: "Placeholder" };

const variantResult = (index: number): EvalVariantResult => ({
  distribution: DISTRIBUTION,
  lastRunAt: EPOCH,
  lastRunId: `placeholder-run-${index}`,
  runs: 1,
  variant: { ...VARIANT, id: `placeholder-variant-${index}` },
});

const TRAJECTORY: EvalTrial["trajectory"] = placeholders(6, (index) =>
  index % 2 === 0
    ? {
        _tag: "message" as const,
        finishedAtMillis: index * 1000,
        role: "assistant" as const,
        text: placeholderText(index),
      }
    : {
        _tag: "command" as const,
        command: placeholderText(index),
        exitCode: 0,
        finishedAtMillis: index * 1000 + 500,
        output: "",
        startedAtMillis: index * 1000,
      }
);

export const placeholderTrial = (ordinal: number): EvalTrial => ({
  artifacts: [],
  commands: 0,
  costs: null,
  exitCode: 0,
  failedCommands: 0,
  filesChanged: [],
  id: `placeholder-trial-${ordinal}`,
  modelMs: 0,
  ordinal,
  sandboxId: null,
  sandboxMs: 0,
  status: "passed",
  timed: true,
  trajectory: TRAJECTORY,
  usage: null,
  validations: [],
  verifySteps: [],
  voidFields: [],
});

export const placeholderRun = (index: number): EvalRun => ({
  batchId: "placeholder-batch",
  case: { id: "placeholder-case", name: placeholderText(index) },
  costs: null,
  definitionHash: "placeholder",
  distribution: DISTRIBUTION,
  finishedAt: EPOCH,
  harnessVersion: "0.0.0",
  id: `placeholder-run-${index}`,
  local: false,
  profileVersion: null,
  setup: {
    prepare: null,
    prompt: placeholderText(index),
    source: { kind: "empty" },
    validator: null,
    verify: null,
  },
  startedAt: EPOCH,
  status: "finished",
  suite: SUITE,
  trials: [placeholderTrial(1)],
  trigger: { source: "cli" },
  variant: VARIANT,
});

export const PLACEHOLDER_CASE_PAGE: EvalCasePage = {
  cases: placeholders(8, (index) => ({
    id: `placeholder-case-${index}`,
    lastRunAt: EPOCH,
    name: placeholderText(index),
    suite: SUITE,
    tags: [],
    variants: [variantResult(0), variantResult(1)],
  })),
  next: null,
  suites: [],
  tags: [],
};

const placeholderSuite = (index: number): EvalSuiteSummary => ({
  cases: 4,
  id: `placeholder-suite-${index}`,
  lastRunAt: EPOCH,
  name: placeholderText(index),
  tally: { passed: 1, scored: 1 },
  variants: 2,
});

export const PLACEHOLDER_SUITE_PAGE: EvalSuitePage = {
  next: null,
  suites: placeholders(8, placeholderSuite),
};

export const PLACEHOLDER_SUITE_DETAIL: EvalSuiteDetail = {
  ...placeholderSuite(1),
  setup: { prompt: placeholderText(2), source: { kind: "empty" } },
  tags: [],
};

export const PLACEHOLDER_RUN_PAGE: EvalRunPage = {
  page: 1,
  pageSize: 8,
  runs: placeholders(8, placeholderRun),
  total: 8,
};

export const PLACEHOLDER_CASE_DETAIL: EvalCaseDetail = {
  id: "placeholder-case",
  name: placeholderText(1),
  setup: placeholderRun(0).setup,
  suite: SUITE,
  tags: [],
  variants: [variantResult(0)],
  versions: [
    {
      author: "Placeholder author",
      changes: [],
      createdAt: EPOCH,
      definitionHash: "placeholder",
    },
  ],
};

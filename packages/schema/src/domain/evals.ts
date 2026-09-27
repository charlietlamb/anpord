import { Schema } from "effect";
import { EvalCosts } from "./eval-costs";
import { EvalSandbox, EvalSource } from "./eval-definition";
import { EvalCaseId, EvalSuiteId } from "./eval-limits";
import { EvalSourceFiles } from "./eval-source-files";
import { EvalHarness, EvalTrial } from "./eval-trial";
import { EvalTrigger } from "./eval-trigger";

export const EvalRunStatus = Schema.Literal("running", "finished", "failed");
export type EvalRunStatus = typeof EvalRunStatus.Type;

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

export const EvalTimestamp = Schema.DateTimeUtc.annotations({
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

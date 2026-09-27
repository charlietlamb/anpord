import { Schema } from "effect";
import { EvalCaseId } from "./eval-limits";
import {
  EvalBatchSummary,
  EvalSuite,
  EvalTimestamp,
  EvalVariant,
} from "./evals";

export const EvalHomeRange = Schema.Literal("7d", "30d", "90d");
export type EvalHomeRange = typeof EvalHomeRange.Type;

export const EvalHomeVerdict = Schema.Literal(
  "passed",
  "failed",
  "flaky",
  "unscored"
);
export type EvalHomeVerdict = typeof EvalHomeVerdict.Type;

export const EvalHomeFailure = Schema.Struct({
  check: Schema.String,
  message: Schema.NullOr(Schema.String),
}).annotations({
  description: "The first check that failed in an eval's newest run.",
  identifier: "EvalHomeFailure",
});
export type EvalHomeFailure = typeof EvalHomeFailure.Type;

export const EvalHomeEval = Schema.Struct({
  caseId: EvalCaseId,
  caseName: Schema.String,
  failure: Schema.NullOr(EvalHomeFailure),
  finishedAt: EvalTimestamp,
  newlyFailing: Schema.Boolean,
  passed: Schema.Int,
  runId: Schema.String,
  scored: Schema.Int,
  suite: EvalSuite,
  unscoredReason: Schema.NullOr(Schema.String),
  variant: EvalVariant,
  verdict: EvalHomeVerdict,
}).annotations({
  description:
    "A case on one variant, judged by its newest settled run. Flaky means that run had both passing and failing trials.",
  identifier: "EvalHomeEval",
});
export type EvalHomeEval = typeof EvalHomeEval.Type;

export const EvalHomeDay = Schema.Struct({
  day: Schema.String,
  passed: Schema.Int,
  scored: Schema.Int,
  suiteId: Schema.String,
  variant: Schema.String,
}).annotations({
  description:
    "Trials scored on one UTC day for one suite and variant label, the unit every trend is summed from.",
  identifier: "EvalHomeDay",
});
export type EvalHomeDay = typeof EvalHomeDay.Type;

export const EvalHome = Schema.Struct({
  days: Schema.Array(EvalHomeDay),
  evals: Schema.Array(EvalHomeEval),
  range: EvalHomeRange,
  recentBatches: Schema.Array(EvalBatchSummary),
  spendUsd: Schema.Number,
}).annotations({
  description:
    "An organization's eval health: every case on every variant, daily trends over the range, recent batches and estimated spend.",
  identifier: "EvalHome",
});
export type EvalHome = typeof EvalHome.Type;

export const variantLabel = ({
  harness,
  model,
  profile,
}: Pick<EvalVariant, "harness" | "model" | "profile">) =>
  profile === null ? `${harness}/${model}` : `${harness}/${model}@${profile}`;

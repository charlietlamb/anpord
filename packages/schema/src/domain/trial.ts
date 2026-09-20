import { type Option, Schema } from "effect";
import { EvalJudgment } from "./eval-judges";
import { EvalValidations } from "./eval-validations";
import { EvalArtifactMetadata } from "./evals";

/* `void` is its own status, never a flavour of `failed`: a trial whose commands
   never executed is not evidence about the harness. */
export const TrialStatus = Schema.Literal(
  "queued",
  "running",
  "passed",
  "failed",
  "void"
);
export type TrialStatus = typeof TrialStatus.Type;

/* Decoded, not asserted: the column has no check constraint, so an older deploy's
   row may carry a status this build does not name. */
export const decodeTrialStatus: (value: string) => Option.Option<TrialStatus> =
  Schema.decodeUnknownOption(TrialStatus);

export const VerifyStepResult = Schema.Struct({
  command: Schema.String,
  exitCode: Schema.Int,
});
export type VerifyStepResult = typeof VerifyStepResult.Type;

export const TrialOutcome = Schema.Struct({
  artifacts: Schema.optional(Schema.Array(EvalArtifactMetadata)),
  validations: Schema.optional(EvalValidations),
  judgments: Schema.optional(Schema.Array(EvalJudgment)),
  commandCount: Schema.Int,
  exitCode: Schema.Int,
  modelMs: Schema.Int,
  passed: Schema.Boolean,
  sandboxMs: Schema.Int,
  status: TrialStatus,
  /* In run order, up to and including the one that failed. */
  verifySteps: Schema.Array(VerifyStepResult),
  voidFields: Schema.Array(Schema.String),
});
export type TrialOutcome = typeof TrialOutcome.Type;

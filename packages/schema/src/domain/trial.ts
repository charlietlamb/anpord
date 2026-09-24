import { type Option, Schema } from "effect";
import { EvalValidations } from "./eval-validations";
import { EvalArtifactMetadata, EvalTrialStatus, EvalVerifyStep } from "./evals";

export const decodeTrialStatus: (
  value: string
) => Option.Option<EvalTrialStatus> =
  Schema.decodeUnknownOption(EvalTrialStatus);

export const TrialOutcome = Schema.Struct({
  artifacts: Schema.optionalWith(Schema.Array(EvalArtifactMetadata), {
    default: () => [],
  }),
  commandCount: Schema.Int,
  exitCode: Schema.Int,
  modelMs: Schema.Int,
  sandboxMs: Schema.Int,
  status: EvalTrialStatus,
  validations: Schema.optionalWith(EvalValidations, { default: () => [] }),
  verifySteps: Schema.Array(EvalVerifyStep),
  voidFields: Schema.Array(Schema.String),
});
export type TrialOutcome = typeof TrialOutcome.Type;

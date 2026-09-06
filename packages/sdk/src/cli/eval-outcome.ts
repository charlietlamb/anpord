import { EvalRun } from "@anpord/schema/domain/evals";
import { Schema } from "effect";

export const EvalOutcome = Schema.Struct({
  file: Schema.String,
  problems: Schema.Array(Schema.String),
  run: Schema.NullOr(EvalRun),
  runId: Schema.NullOr(Schema.String),
});
export type EvalOutcome = typeof EvalOutcome.Type;

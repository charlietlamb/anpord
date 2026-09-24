import { EvalBatch } from "@anpord/schema/domain/evals";
import { Schema } from "effect";

export const EvalOutcome = Schema.Struct({
  batch: Schema.NullOr(EvalBatch),
  batchId: Schema.NullOr(Schema.String),
  file: Schema.String,
  problems: Schema.Array(Schema.String),
});
export type EvalOutcome = typeof EvalOutcome.Type;

import { Schema } from "effect";

export const EVAL_RUN = "eval-run";

export const EvalBatchPayload = Schema.Struct({
  batchId: Schema.String,
  organizationId: Schema.String,
});

export type EvalBatchPayload = typeof EvalBatchPayload.Type;

import { Schema } from "effect";
import { MAX_START_TRIALS } from "./eval-quota";

export const RunCaseRequest = Schema.Struct({
  trials: Schema.Int.pipe(Schema.between(1, MAX_START_TRIALS)),
  variant: Schema.optional(Schema.String),
}).annotations({
  description:
    "Run a case again on one of its variants, or on every variant when none is named.",
  identifier: "RunCaseRequest",
});
export type RunCaseRequest = typeof RunCaseRequest.Type;

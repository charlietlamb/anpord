import { Schema } from "effect";
import { MAX_START_TRIALS, MAX_START_VARIANTS } from "./eval-quota";

export const RunCaseRequest = Schema.Struct({
  trials: Schema.optionalWith(
    Schema.Int.pipe(Schema.between(1, MAX_START_TRIALS)),
    { default: () => 1 }
  ),
  variants: Schema.optional(
    Schema.Array(Schema.String).pipe(
      Schema.minItems(1),
      Schema.maxItems(MAX_START_VARIANTS)
    )
  ),
}).annotations({
  description:
    "Run a case again on the variants named, or on every variant it has run on when none are.",
  identifier: "RunCaseRequest",
});
export type RunCaseRequest = typeof RunCaseRequest.Type;

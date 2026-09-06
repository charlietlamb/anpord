import { Schema } from "effect";
import { EvalHarness } from "./harness";

const text = Schema.String.pipe(Schema.minLength(1));
export const EvalScore = Schema.Number.pipe(Schema.between(0, 1));
const fields = {
  kind: Schema.Literal("judge"),
  name: text.pipe(Schema.maxLength(100)),
  model: text.pipe(Schema.maxLength(200)),
  rubric: text.pipe(Schema.maxLength(32_000)),
  expected: Schema.optional(Schema.String.pipe(Schema.maxLength(32_000))),
  choices: Schema.Record({ key: text, value: EvalScore }).pipe(
    Schema.filter(
      (value) =>
        Object.keys(value).length > 0 && Object.keys(value).length <= 20,
      {
        message: () => "A judge needs between 1 and 20 scored choices",
      }
    )
  ),
  threshold: Schema.optionalWith(EvalScore, { default: () => 1 }),
  timeoutMs: Schema.optionalWith(
    Schema.Int.pipe(Schema.between(1000, 300_000)),
    {
      default: () => 120_000,
    }
  ),
};

export const EvalJudge = Schema.Union(
  Schema.Struct({
    ...fields,
    provider: Schema.Literal("openai"),
    harness: Schema.optional(Schema.Never),
  }),
  Schema.Struct({
    ...fields,
    provider: Schema.optional(Schema.Never),
    harness: Schema.Literal(
      ...EvalHarness.literals.filter((harness) => harness !== "command")
    ),
  })
);
export type EvalJudge = typeof EvalJudge.Type;

export const EvalJudgment = Schema.Struct({
  name: Schema.String,
  model: Schema.String,
  evaluator: Schema.String,
  score: Schema.NullOr(EvalScore),
  choice: Schema.NullOr(Schema.String),
  reason: Schema.String,
  threshold: EvalScore,
  durationMs: Schema.NonNegativeInt,
  error: Schema.NullOr(Schema.String),
});
export type EvalJudgment = typeof EvalJudgment.Type;

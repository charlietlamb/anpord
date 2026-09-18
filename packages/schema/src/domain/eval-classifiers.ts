import { Schema } from "effect";

const text = Schema.String.pipe(Schema.minLength(1));

export const ClassifierConfidence = Schema.Number.pipe(Schema.between(0, 1));

/* A description per option rather than a score: the classifier is told what
   each label means and answers with a distribution over them, so the decision
   is which label won and how sure it is, not a number the author assigned. */
export const EvalClassifier = Schema.Struct({
  kind: Schema.Literal("classifier"),
  name: text.pipe(Schema.maxLength(100)),
  model: text.pipe(Schema.maxLength(200)),
  prompt: text.pipe(Schema.maxLength(32_000)),
  options: Schema.Record({
    key: text,
    value: Schema.NullOr(Schema.String.pipe(Schema.maxLength(2000))),
  }).pipe(
    Schema.filter(
      (value) => {
        const count = Object.keys(value).length;
        return count >= 2 && count <= 255;
      },
      {
        message: () => "A classifier needs between 2 and 255 options",
      }
    )
  ),
  expect: text.pipe(Schema.maxLength(100)),
  minConfidence: Schema.optionalWith(ClassifierConfidence, {
    default: () => 0,
  }),
  timeoutMs: Schema.optionalWith(
    Schema.Int.pipe(Schema.between(1000, 300_000)),
    { default: () => 30_000 }
  ),
}).pipe(
  Schema.filter((value) => Object.hasOwn(value.options, value.expect), {
    message: () => "A classifier must expect one of its own options",
  })
);
export type EvalClassifier = typeof EvalClassifier.Type;

/* The distribution is the evidence a reader gets, since the model returns no
   prose: which label won, how the probability spread across the rest, and
   whether that cleared the floor the author set. */
export const EvalClassification = Schema.Struct({
  name: Schema.String,
  model: Schema.String,
  choice: Schema.NullOr(Schema.String),
  expected: Schema.String,
  probabilities: Schema.Record({
    key: Schema.String,
    value: ClassifierConfidence,
  }),
  confidence: Schema.NullOr(ClassifierConfidence),
  minConfidence: ClassifierConfidence,
  durationMs: Schema.NonNegativeInt,
  error: Schema.NullOr(Schema.String),
});
export type EvalClassification = typeof EvalClassification.Type;

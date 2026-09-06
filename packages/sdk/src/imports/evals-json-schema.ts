import { Schema } from "effect";

/* The only checks that convert mechanically: a needle list and a rule over
   it, rather than a description of intent. */
const AssertionKind = Schema.Literal(
  "content_contains_any",
  "content_contains_all",
  "content_contains_none"
);

export const StructuredAssertion = Schema.Struct({
  kind: AssertionKind,
  needles: Schema.Array(Schema.String),
  text: Schema.String,
});

export type StructuredAssertion = typeof StructuredAssertion.Type;

/* Both dialects occur, sometimes in sibling files: a bare string is prose, an
   object is a mechanical check. */
const Assertion = Schema.Union(Schema.String, StructuredAssertion);

export const EvalsJsonCase = Schema.Struct({
  assertions: Schema.Array(Assertion),
  expected_output: Schema.optional(Schema.String),
  files: Schema.optionalWith(Schema.Array(Schema.String), {
    default: () => [],
  }),
  id: Schema.Int,
  name: Schema.optional(Schema.String),
  prompt: Schema.String,
});

export type EvalsJsonCase = typeof EvalsJsonCase.Type;

export const EvalsJsonFile = Schema.Struct({
  evals: Schema.Array(EvalsJsonCase),
  skill_name: Schema.String,
});

export type EvalsJsonFile = typeof EvalsJsonFile.Type;

export const decodeEvalsJson = Schema.decodeUnknown(EvalsJsonFile, {
  errors: "all",
});

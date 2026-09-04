import { Schema } from "effect";

/** The runner's own default when a file omits the field, kept here so an
 * imported case carries the budget it actually ran under. */
const DEFAULT_MAX_STEPS = 15;

/** A missing `judge_context` is a case whose author wrote nothing about how to
 * judge it, which the runner reads as one generic line. It is not an error, so
 * it decodes to an empty list and the generated case says so. */
export const YamlCase = Schema.Struct({
  judge_context: Schema.optionalWith(Schema.Array(Schema.String), {
    default: () => [],
  }),
  max_steps: Schema.optionalWith(Schema.Int, {
    default: () => DEFAULT_MAX_STEPS,
  }),
  name: Schema.String,
  task: Schema.String,
});

export type YamlCase = typeof YamlCase.Type;

export const decodeYamlCase = Schema.decodeUnknown(YamlCase, { errors: "all" });

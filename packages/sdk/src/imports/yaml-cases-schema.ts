import { Schema } from "effect";

/* The source runner's own default, so an imported case carries the budget it
   actually ran under. */
const DEFAULT_MAX_STEPS = 15;

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

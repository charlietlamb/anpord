import { Schema } from "effect";

const CliCallSchema = Schema.Struct({
  cli: Schema.String,
  command: Schema.String,
  error: Schema.optional(Schema.String),
  input: Schema.Unknown,
  output: Schema.optional(Schema.Unknown),
});

export type CliCall = typeof CliCallSchema.Type;

import { Schema } from "effect";

const McpCallSchema = Schema.Struct({
  error: Schema.optional(Schema.String),
  input: Schema.Unknown,
  kind: Schema.Literal("tool", "resource"),
  name: Schema.String,
  output: Schema.optional(Schema.Unknown),
  server: Schema.String,
});

export type McpCall = typeof McpCallSchema.Type;

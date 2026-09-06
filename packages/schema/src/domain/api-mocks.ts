import { Schema } from "effect";
import { ValidationValue } from "./eval-validations";

export const API_PROGRAM = "workspace/.anpord/api/program.json";
export const API_MANIFEST = ".anpord/api/manifest.json";
export const API_JOURNAL = ".anpord/api/calls.jsonl";
export const API_READY = "ANPORD_API_READY=";
export const API_CALL_LIMIT = 256;

export const ApiProgram = Schema.Struct({
  entry: Schema.Literal(".anpord/api/server.mjs"),
});
export const ApiManifest = Schema.Array(
  Schema.Struct({
    name: Schema.String,
    url: Schema.String,
    endpoints: Schema.Array(
      Schema.Struct({
        method: Schema.String,
        path: Schema.String,
        description: Schema.optional(Schema.String),
      })
    ),
  })
);
export type ApiManifest = typeof ApiManifest.Type;

export class ApiCall extends Schema.Class<ApiCall>("ApiCall")({
  api: Schema.String,
  index: Schema.NonNegativeInt,
  method: Schema.String,
  path: Schema.String,
  matched: Schema.Boolean,
  startedAt: Schema.Number,
  durationMs: Schema.NonNegativeInt,
  input: ValidationValue,
  output: ValidationValue,
  status: Schema.Int,
  error: Schema.NullOr(Schema.String.pipe(Schema.maxLength(2000))),
  logs: Schema.Array(ValidationValue).pipe(Schema.maxItems(64)),
}) {}

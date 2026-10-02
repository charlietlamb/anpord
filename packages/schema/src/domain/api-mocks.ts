import { Schema } from "effect";
import { type CaptureLimits, ReportedValue } from "./eval-validations";

export const API_PROGRAM = "workspace/.sphynx/api/program.json";
export const API_MANIFEST = ".sphynx/api/manifest.json";
export const API_JOURNAL = ".sphynx/api/calls.jsonl";
export const CLI_JOURNAL = ".sphynx/cli-calls.jsonl";
export const MCP_JOURNAL = ".sphynx/mcp-calls.jsonl";
export const API_READY = "SPHYNX_API_READY=";
export const API_CALL_LIMIT = 256;
export const API_REPORTED_LIMITS: CaptureLimits = {
  budget: 96_000,
  text: 64_000,
};

export const ApiProgram = Schema.Struct({
  entry: Schema.Literal(".sphynx/api/server.mjs"),
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
  input: ReportedValue,
  output: ReportedValue,
  status: Schema.Int,
  error: Schema.NullOr(Schema.String.pipe(Schema.maxLength(2000))),
  logs: Schema.Array(ReportedValue).pipe(Schema.maxItems(64)),
}) {}

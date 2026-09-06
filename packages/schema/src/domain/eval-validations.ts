import { Schema } from "effect";
import { EvalJudgment } from "./eval-judges";

export const VALIDATION_TEXT_LIMIT = 16_000;
export const VALIDATION_BUDGET = 64_000;
export const VALIDATION_ENTRY_LIMIT = 64;
export const VALIDATION_FRAME = "ANPORD_VALIDATION=";

export const ValidationValue = Schema.Struct({
  text: Schema.String.pipe(Schema.maxLength(VALIDATION_TEXT_LIMIT)),
  format: Schema.Literal("text", "json"),
  state: Schema.Literal("captured", "disabled", "unavailable"),
  truncated: Schema.Boolean,
}).annotations({ identifier: "ValidationValue" });
export type ValidationValue = typeof ValidationValue.Type;

export const ValidationCall = Schema.Struct({
  index: Schema.NonNegativeInt,
  method: Schema.Literal(
    "answer",
    "transcript",
    "readText",
    "exists",
    "exec",
    "cli.calls",
    "api.calls",
    "api.url",
    "mcp.calls"
  ),
  startedAt: Schema.Number,
  durationMs: Schema.NullOr(Schema.NonNegativeInt),
  input: ValidationValue,
  output: ValidationValue,
  error: Schema.NullOr(ValidationValue),
}).annotations({ identifier: "ValidationCall" });
export type ValidationCall = typeof ValidationCall.Type;

export const EvalValidation = Schema.Struct({
  id: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(200)),
  index: Schema.NonNegativeInt,
  name: Schema.String.pipe(Schema.maxLength(200)),
  kind: Schema.Literal("code", "judge", "command"),
  status: Schema.Literal(
    "queued",
    "running",
    "passed",
    "failed",
    "error",
    "skipped"
  ),
  startedAt: Schema.NullOr(Schema.Number),
  durationMs: Schema.NullOr(Schema.NonNegativeInt),
  message: Schema.String.pipe(Schema.maxLength(2000)),
  exitCode: Schema.NullOr(Schema.Int),
  truncated: Schema.Boolean,
  judgment: Schema.optional(EvalJudgment),
  input: ValidationValue,
  output: ValidationValue,
  error: Schema.NullOr(ValidationValue),
  metadata: Schema.optional(ValidationValue),
  calls: Schema.Array(ValidationCall).pipe(
    Schema.maxItems(VALIDATION_ENTRY_LIMIT)
  ),
  logs: Schema.Array(
    Schema.Struct({
      index: Schema.NonNegativeInt,
      at: Schema.Number,
      level: Schema.Literal("stdout", "stderr"),
      value: ValidationValue,
    })
  ).pipe(Schema.maxItems(VALIDATION_ENTRY_LIMIT)),
}).annotations({ identifier: "EvalValidation" });
export type EvalValidation = typeof EvalValidation.Type;
export const EvalValidations = Schema.Array(EvalValidation)
  .pipe(Schema.maxItems(40))
  .annotations({ identifier: "EvalValidations" });

export const validationSnapshot = (value: EvalValidation): EvalValidation => ({
  ...value,
  truncated:
    value.truncated ||
    [
      value.input,
      value.output,
      value.error,
      value.metadata,
      ...value.calls.flatMap((call) => [call.input, call.output, call.error]),
      ...value.logs.map((log) => log.value),
    ].some((field) => field?.truncated),
});

export const unavailableValue: ValidationValue = {
  text: "",
  format: "text",
  state: "unavailable",
  truncated: false,
};

export const validationCapture = (enabled = true) => {
  let remaining = VALIDATION_BUDGET;
  return (
    value: unknown,
    format: ValidationValue["format"] = "json"
  ): ValidationValue => {
    if (!enabled) {
      return { ...unavailableValue, state: "disabled", format };
    }
    try {
      const raw = format === "text" ? String(value) : JSON.stringify(value);
      if (raw === undefined) {
        return { ...unavailableValue, format };
      }
      const text = raw.slice(0, Math.min(remaining, VALIDATION_TEXT_LIMIT));
      remaining -= text.length;
      return {
        text,
        format,
        state: "captured",
        truncated: text.length < raw.length,
      };
    } catch {
      return { ...unavailableValue, format };
    }
  };
};

export const validationExecution = (
  identity: Pick<EvalValidation, "id" | "index" | "name" | "kind">,
  startedAt: number | null
): EvalValidation => ({
  ...identity,
  startedAt,
  status: startedAt === null ? "skipped" : "running",
  durationMs: null,
  exitCode: null,
  message: "",
  truncated: false,
  input: unavailableValue,
  output: unavailableValue,
  error: null,
  calls: [],
  logs: [],
});

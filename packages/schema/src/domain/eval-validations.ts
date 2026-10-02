import { Schema } from "effect";
import { EvalJudgment } from "./eval-judges";
import { redactSecrets } from "./secret-text";

export const VALIDATION_TEXT_LIMIT = 16_000;
export const VALIDATION_BUDGET = 64_000;
export const VALIDATION_ENTRY_LIMIT = 64;
export const VALIDATION_FRAME = "SPHYNX_VALIDATION=";

export interface CaptureLimits {
  readonly budget: number;
  readonly text: number;
}

export const EVIDENCE_LIMITS: CaptureLimits = {
  budget: VALIDATION_BUDGET,
  text: VALIDATION_TEXT_LIMIT,
};

export const REPORTED_LIMITS: CaptureLimits = {
  budget: 192_000,
  text: 64_000,
};

const DurationMs = Schema.transform(Schema.Number, Schema.NonNegativeInt, {
  decode: (value) => Math.max(0, Math.round(value)),
  encode: (value: number) => value,
  strict: true,
});

export const validationDuration = (
  startedAt: number | null,
  finished: number
) =>
  startedAt === null ? null : Math.max(0, Math.round(finished - startedAt));

const valueWithin = (limit: number) =>
  Schema.Struct({
    text: Schema.String.pipe(Schema.maxLength(limit)),
    format: Schema.Literal("text", "json"),
    state: Schema.Literal("captured", "disabled", "unavailable"),
    truncated: Schema.Boolean,
  });

type ValueSchema = ReturnType<typeof valueWithin>;

const callOf = (value: ValueSchema) =>
  Schema.Struct({
    index: Schema.NonNegativeInt,
    method: Schema.Literal(
      "answer",
      "transcript",
      "turns",
      "readText",
      "exists",
      "exec",
      "cli.calls",
      "api.calls",
      "api.url",
      "mcp.calls"
    ),
    startedAt: Schema.Number,
    durationMs: Schema.NullOr(DurationMs),
    input: value,
    output: value,
    error: Schema.NullOr(value),
  });

const validationOf = (value: ValueSchema, call: ReturnType<typeof callOf>) =>
  Schema.Struct({
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
    durationMs: Schema.NullOr(DurationMs),
    message: Schema.String.pipe(Schema.maxLength(2000)),
    exitCode: Schema.NullOr(Schema.Int),
    truncated: Schema.Boolean,
    judgment: Schema.optional(EvalJudgment),
    input: value,
    output: value,
    error: Schema.NullOr(value),
    metadata: Schema.optional(value),
    calls: Schema.Array(call).pipe(Schema.maxItems(VALIDATION_ENTRY_LIMIT)),
    logs: Schema.Array(
      Schema.Struct({
        index: Schema.NonNegativeInt,
        at: Schema.Number,
        level: Schema.Literal("stdout", "stderr"),
        value,
      })
    ).pipe(Schema.maxItems(VALIDATION_ENTRY_LIMIT)),
  });

export const ValidationValue = valueWithin(VALIDATION_TEXT_LIMIT).annotations({
  identifier: "ValidationValue",
});
export type ValidationValue = typeof ValidationValue.Type;

export const ValidationCall = callOf(ValidationValue).annotations({
  identifier: "ValidationCall",
});
export type ValidationCall = typeof ValidationCall.Type;

export const EvalValidation = validationOf(
  ValidationValue,
  ValidationCall
).annotations({ identifier: "EvalValidation" });
export type EvalValidation = typeof EvalValidation.Type;

export const ReportedValue = valueWithin(REPORTED_LIMITS.text);

export const ReportedValidation = validationOf(
  ReportedValue,
  callOf(ReportedValue)
);

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

const withoutText = (value: ValidationValue): ValidationValue =>
  value.text === ""
    ? value
    : { ...unavailableValue, format: value.format, truncated: true };

const orNull = (value: ValidationValue | null) =>
  value === null ? null : withoutText(value);

export const validationWithoutEvidence = (
  value: EvalValidation
): EvalValidation => ({
  ...value,
  calls: value.calls.map((call) => ({
    ...call,
    error: orNull(call.error),
    input: withoutText(call.input),
    output: withoutText(call.output),
  })),
  error: orNull(value.error),
  input: withoutText(value.input),
  logs: value.logs.map((log) => ({ ...log, value: withoutText(log.value) })),
  output: withoutText(value.output),
  truncated: true,
  ...(value.metadata === undefined
    ? {}
    : { metadata: withoutText(value.metadata) }),
});

export const validationCapture = (
  enabled = true,
  secrets: readonly string[] = [],
  limits: CaptureLimits = EVIDENCE_LIMITS
) => {
  let remaining = limits.budget;
  return (
    value: unknown,
    format: ValidationValue["format"] = "json"
  ): ValidationValue => {
    if (!enabled) {
      return { ...unavailableValue, state: "disabled", format };
    }
    try {
      const encoded = format === "text" ? String(value) : JSON.stringify(value);
      if (encoded === undefined) {
        return { ...unavailableValue, format };
      }
      const raw = redactSecrets(encoded, secrets);
      const text = raw.slice(0, Math.min(remaining, limits.text));
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

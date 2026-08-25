import { Option, Schema } from "effect";
import type { HarnessEvent, HarnessUsage } from "../../domain/harness-event";
import type { DecodedOutput } from "./support";

const Stats = Schema.Struct({
  input_tokens: Schema.optional(Schema.Number),
  output_tokens: Schema.optional(Schema.Number),
  total_tokens: Schema.optional(Schema.Number),
});

const Line = Schema.Union(
  Schema.Struct({
    model: Schema.optional(Schema.String),
    session_id: Schema.String,
    type: Schema.Literal("init"),
  }),
  Schema.Struct({
    content: Schema.String,
    role: Schema.String,
    type: Schema.Literal("message"),
  }),
  Schema.Struct({
    name: Schema.String,
    parameters: Schema.optional(Schema.Unknown),
    tool_id: Schema.optional(Schema.String),
    type: Schema.Literal("tool_use"),
  }),
  Schema.Struct({
    stats: Schema.optional(Stats),
    type: Schema.Literal("result"),
  }),
  Schema.Struct({
    message: Schema.optional(Schema.String),
    type: Schema.Literal("error"),
  })
);

const decode = Schema.decodeUnknownOption(Line);
const ToolInput = Schema.Struct({
  command: Schema.optional(Schema.String),
  file_path: Schema.optional(Schema.String),
  path: Schema.optional(Schema.String),
});
const decodeToolInput = Schema.decodeUnknownOption(ToolInput);

const toolOf = (
  name: string,
  id: string | undefined,
  parameters: unknown,
  at: number
): HarnessEvent => {
  const input = decodeToolInput(parameters);
  const lower = name.toLowerCase();

  if (Option.isSome(input) && input.value.command && lower.includes("shell")) {
    return {
      _tag: "Command",
      at,
      command: input.value.command,
      exitCode: null,
      output: "",
    };
  }

  const path = Option.isSome(input)
    ? (input.value.file_path ?? input.value.path)
    : undefined;

  if (path && (lower.includes("write") || lower.includes("edit"))) {
    return { _tag: "FileChange", at, paths: [path] };
  }

  return {
    _tag: "ToolCall",
    at,
    callId: id ?? null,
    input: JSON.stringify(parameters ?? null),
    name,
    status: null,
  };
};

/* Gemini's stats carry no cache counts, so these are zero: the run may well
   have hit a cache, and this harness does not say. Read them as unreported
   rather than as a cache that was never used. */
const usageOf = (stats: typeof Stats.Type): HarnessUsage => ({
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  inputTokens: stats.input_tokens ?? 0,
  outputTokens: stats.output_tokens ?? 0,
  totalTokens:
    stats.total_tokens ??
    (stats.input_tokens ?? 0) + (stats.output_tokens ?? 0),
});

export const decodeGeminiLine = (line: string, at: number): DecodedOutput => {
  const parsed = Option.liftThrowable(JSON.parse)(line);

  if (Option.isNone(parsed)) {
    return {};
  }

  const found = decode(parsed.value);

  if (Option.isNone(found)) {
    return {};
  }

  const value = found.value;

  if (value.type === "init") {
    return { model: value.model, sessionId: value.session_id };
  }

  if (value.type === "message") {
    return value.role === "assistant"
      ? {
          events: [
            { _tag: "Message", at, role: "assistant", text: value.content },
          ],
        }
      : {};
  }

  if (value.type === "tool_use") {
    return {
      events: [toolOf(value.name, value.tool_id, value.parameters, at)],
    };
  }

  if (value.type === "result") {
    return {
      events: [{ _tag: "Finished", at, reason: "result" }],
      usage: value.stats === undefined ? undefined : usageOf(value.stats),
    };
  }

  return {
    events: [
      {
        _tag: "Finished",
        at,
        reason: value.message ?? "error",
      },
    ],
  };
};

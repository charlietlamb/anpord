import type { HarnessUsage } from "@anpord/schema/domain/harness-event";
import { Option, Schema } from "effect";
import type { DecodedOutput } from "./session";
import { toolOf } from "./tool-event";

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

const decode = Schema.decodeUnknownOption(Schema.parseJson(Line));

const toolEvent = toolOf("shell");

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
  const found = decode(line);

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
      events: [
        toolEvent({
          at,
          callId: value.tool_id,
          input: value.parameters,
          name: value.name,
        }),
      ],
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

import type {
  HarnessEvent,
  HarnessUsage,
} from "@anpord/schema/domain/harness-event";
import { Option, Schema } from "effect";
import type { DecodedOutput } from "./session";
import { toolOf } from "./tool-event";

const Usage = Schema.Struct({
  cache_creation_input_tokens: Schema.optional(Schema.Number),
  cache_read_input_tokens: Schema.optional(Schema.Number),
  input_tokens: Schema.optional(Schema.Number),
  output_tokens: Schema.optional(Schema.Number),
});

const Content = Schema.Struct({
  id: Schema.optional(Schema.String),
  input: Schema.optional(Schema.Unknown),
  name: Schema.optional(Schema.String),
  text: Schema.optional(Schema.String),
  type: Schema.String,
});

const Line = Schema.Union(
  Schema.Struct({
    model: Schema.optional(Schema.String),
    session_id: Schema.String,
    subtype: Schema.String,
    type: Schema.Literal("system"),
  }),
  Schema.Struct({
    message: Schema.Struct({
      content: Schema.Array(Content),
      usage: Schema.optional(Usage),
    }),
    session_id: Schema.optional(Schema.String),
    type: Schema.Literal("assistant"),
  }),
  Schema.Struct({
    is_error: Schema.optional(Schema.Boolean),
    result: Schema.optional(Schema.String),
    session_id: Schema.optional(Schema.String),
    subtype: Schema.optional(Schema.String),
    type: Schema.Literal("result"),
    usage: Schema.optional(Usage),
  })
);

const decode = Schema.decodeUnknownOption(Schema.parseJson(Line));

const toolEvent = toolOf("bash");

const usageOf = (usage: typeof Usage.Type): HarnessUsage => {
  const cacheReadTokens = usage.cache_read_input_tokens ?? 0;
  const cacheWriteTokens = usage.cache_creation_input_tokens ?? 0;
  const inputTokens = usage.input_tokens ?? 0;
  const outputTokens = usage.output_tokens ?? 0;

  return {
    cacheReadTokens,
    cacheWriteTokens,
    inputTokens,
    outputTokens,
    totalTokens:
      inputTokens + outputTokens + cacheReadTokens + cacheWriteTokens,
  };
};

export const decodeClaudeLine = (line: string, at: number): DecodedOutput => {
  const found = decode(line);

  if (Option.isNone(found)) {
    return {};
  }

  const value = found.value;

  if (value.type === "system") {
    return {
      model: value.model,
      sessionId: value.session_id,
    };
  }

  if (value.type === "result") {
    const events: HarnessEvent[] = [];

    if (value.result) {
      events.push({
        _tag: "Message",
        at,
        role: "assistant",
        text: value.result,
      });
    }

    events.push({
      _tag: "Finished",
      at,
      reason: value.subtype ?? (value.is_error ? "error" : "success"),
    });

    return {
      events,
      sessionId: value.session_id,
      usage: value.usage === undefined ? undefined : usageOf(value.usage),
      usageIsCumulative: true,
    };
  }

  const turn =
    value.message.usage === undefined
      ? undefined
      : usageOf(value.message.usage);

  let unspent = turn;

  return {
    events: value.message.content.flatMap((part): readonly HarnessEvent[] => {
      if (part.type === "text" && part.text) {
        const usage = unspent;

        unspent = undefined;

        return [
          { _tag: "Message", at, role: "assistant", text: part.text, usage },
        ];
      }

      return part.type === "tool_use"
        ? [
            toolEvent({
              at,
              callId: part.id,
              input: part.input,
              name: part.name ?? "unknown",
            }),
          ]
        : [];
    }),
    sessionId: value.session_id,
    usage: turn,
  };
};

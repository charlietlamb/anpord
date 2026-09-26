import type {
  HarnessEvent,
  HarnessUsage,
} from "@anpord/schema/domain/harness-event";
import { Option, Schema } from "effect";
import { promptInclusiveUsage } from "../../domain/prompt-inclusive-usage";
import type { DecodedOutput } from "./session";
import { toolOf } from "./tool-event";

const Usage = Schema.Struct({
  cache_creation: Schema.optional(
    Schema.Struct({
      ephemeral_1h_input_tokens: Schema.optional(Schema.Number),
    })
  ),
  cache_creation_input_tokens: Schema.optional(Schema.Number),
  cache_read_input_tokens: Schema.optional(Schema.Number),
  input_tokens: Schema.optional(Schema.Number),
  output_tokens: Schema.optional(Schema.Number),
  total_tokens: Schema.optional(Schema.Number),
});
type Usage = typeof Usage.Type;

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

const anthropicUsage = (usage: Usage): HarnessUsage => {
  const cacheReadTokens = usage.cache_read_input_tokens ?? 0;
  const cacheWriteTokens = usage.cache_creation_input_tokens ?? 0;
  const inputTokens = usage.input_tokens ?? 0;
  const outputTokens = usage.output_tokens ?? 0;
  const hourWrites = usage.cache_creation?.ephemeral_1h_input_tokens;

  return {
    ...(hourWrites === undefined ? {} : { cacheWrite1hTokens: hourWrites }),
    cacheReadTokens,
    cacheWriteTokens,
    inputTokens,
    outputTokens,
    totalTokens:
      inputTokens + outputTokens + cacheReadTokens + cacheWriteTokens,
  };
};

const qwenUsage = (usage: Usage): HarnessUsage =>
  promptInclusiveUsage({
    cached: usage.cache_read_input_tokens ?? 0,
    output: usage.output_tokens ?? 0,
    prompt: usage.input_tokens ?? 0,
    total: usage.total_tokens,
  });

const claudeStyleDecoder =
  (usageOf: (usage: Usage) => HarnessUsage) =>
  (line: string, at: number): DecodedOutput => {
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
    };
  };

export const decodeClaudeLine = claudeStyleDecoder(anthropicUsage);

export const decodeQwenLine = claudeStyleDecoder(qwenUsage);

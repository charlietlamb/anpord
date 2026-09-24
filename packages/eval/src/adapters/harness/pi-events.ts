import type { HarnessUsage } from "@anpord/schema/domain/harness-event";
import { Option, Schema } from "effect";
import type { DecodedOutput } from "./session";
import { toolOf } from "./tool-event";

const Usage = Schema.Struct({
  input: Schema.optional(Schema.Number),
  output: Schema.optional(Schema.Number),
  totalTokens: Schema.optional(Schema.Number),
});

const Message = Schema.Struct({
  content: Schema.optional(
    Schema.Array(
      Schema.Struct({
        text: Schema.optional(Schema.String),
        type: Schema.String,
      })
    )
  ),
  role: Schema.String,
  usage: Schema.optional(Usage),
});

const Line = Schema.Union(
  Schema.Struct({ id: Schema.String, type: Schema.Literal("session") }),
  Schema.Struct({
    message: Message,
    type: Schema.Literal("message_end"),
  }),
  Schema.Struct({
    args: Schema.Unknown,
    toolCallId: Schema.String,
    toolName: Schema.String,
    type: Schema.Literal("tool_execution_start"),
  }),
  Schema.Struct({ type: Schema.Literal("agent_end") })
);

const decode = Schema.decodeUnknownOption(Schema.parseJson(Line));

const toolEvent = toolOf("bash");

const usageOf = (usage: typeof Usage.Type): HarnessUsage => ({
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  inputTokens: usage.input ?? 0,
  outputTokens: usage.output ?? 0,
  totalTokens: usage.totalTokens ?? (usage.input ?? 0) + (usage.output ?? 0),
});

export const decodePiLine = (line: string, at: number): DecodedOutput => {
  const found = decode(line);

  if (Option.isNone(found)) {
    return {};
  }

  const value = found.value;

  if (value.type === "session") {
    return { sessionId: value.id };
  }

  if (value.type === "agent_end") {
    return { events: [{ _tag: "Finished", at, reason: "agent_end" }] };
  }

  if (value.type === "tool_execution_start") {
    return {
      events: [
        toolEvent({
          at,
          callId: value.toolCallId,
          input: value.args,
          name: value.toolName,
        }),
      ],
    };
  }

  const text = (value.message.content ?? [])
    .flatMap((part) => (part.type === "text" && part.text ? [part.text] : []))
    .join("");

  return {
    events: text ? [{ _tag: "Message", at, role: "assistant", text }] : [],
    usage:
      value.message.usage === undefined
        ? undefined
        : usageOf(value.message.usage),
  };
};

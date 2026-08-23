import { Option, Schema } from "effect";
import type { HarnessEvent, HarnessUsage } from "../../domain/harness-event";
import type { DecodedOutput } from "./support";

const Usage = Schema.Struct({
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

const decode = Schema.decodeUnknownOption(Line);
const ToolInput = Schema.Struct({
  command: Schema.optional(Schema.String),
  file_path: Schema.optional(Schema.String),
  path: Schema.optional(Schema.String),
});
const decodeToolInput = Schema.decodeUnknownOption(ToolInput);

const usageOf = (usage: typeof Usage.Type): HarnessUsage => ({
  inputTokens: usage.input_tokens ?? 0,
  outputTokens: usage.output_tokens ?? 0,
  totalTokens: (usage.input_tokens ?? 0) + (usage.output_tokens ?? 0),
});

const toolOf = (part: typeof Content.Type, at: number): HarnessEvent => {
  const name = part.name ?? "unknown";
  const input = decodeToolInput(part.input);
  const lower = name.toLowerCase();

  if (Option.isSome(input) && input.value.command && lower.includes("bash")) {
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
    callId: part.id ?? null,
    input: JSON.stringify(part.input ?? null),
    name,
    status: null,
  };
};

export const decodeClaudeLine = (line: string, at: number): DecodedOutput => {
  const parsed = Option.liftThrowable(JSON.parse)(line);

  if (Option.isNone(parsed)) {
    return {};
  }

  const found = decode(parsed.value);

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
    };
  }

  return {
    events: value.message.content.flatMap((part): readonly HarnessEvent[] => {
      if (part.type === "text" && part.text) {
        return [{ _tag: "Message", at, role: "assistant", text: part.text }];
      }

      return part.type === "tool_use" ? [toolOf(part, at)] : [];
    }),
    sessionId: value.session_id,
    usage:
      value.message.usage === undefined
        ? undefined
        : usageOf(value.message.usage),
  };
};

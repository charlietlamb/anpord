import { Option, Schema } from "effect";
import type { HarnessEvent, HarnessUsage } from "../../domain/harness-event";
import type { DecodedOutput } from "./support";

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
  Schema.Struct({
    args: Schema.Unknown,
    toolCallId: Schema.String,
    toolName: Schema.String,
    type: Schema.Literal("tool_execution_end"),
  }),
  Schema.Struct({ type: Schema.Literal("agent_end") })
);

const decode = Schema.decodeUnknownOption(Line);
const BashInput = Schema.Struct({ command: Schema.String });
const FileInput = Schema.Struct({ path: Schema.String });
const decodeBash = Schema.decodeUnknownOption(BashInput);
const decodeFile = Schema.decodeUnknownOption(FileInput);
const writes = new Set(["edit", "write"]);

/* No cache counts in this stream: zero here means unreported, not unused. */
const usageOf = (usage: typeof Usage.Type): HarnessUsage => ({
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  inputTokens: usage.input ?? 0,
  outputTokens: usage.output ?? 0,
  totalTokens: usage.totalTokens ?? (usage.input ?? 0) + (usage.output ?? 0),
});

const toolOf = (
  toolName: string,
  toolCallId: string,
  args: unknown,
  at: number
): HarnessEvent => {
  const bash = decodeBash(args);

  if (toolName === "bash" && Option.isSome(bash)) {
    return {
      _tag: "Command",
      at,
      command: bash.value.command,
      exitCode: null,
      output: "",
    };
  }

  const file = decodeFile(args);

  if (writes.has(toolName) && Option.isSome(file)) {
    return { _tag: "FileChange", at, paths: [file.value.path] };
  }

  return {
    _tag: "ToolCall",
    at,
    callId: toolCallId,
    input: JSON.stringify(args),
    name: toolName,
    status: null,
  };
};

export const decodePiLine = (line: string, at: number): DecodedOutput => {
  const parsed = Option.liftThrowable(JSON.parse)(line);

  if (Option.isNone(parsed)) {
    return {};
  }

  const found = decode(parsed.value);

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
      events: [toolOf(value.toolName, value.toolCallId, value.args, at)],
    };
  }

  if (value.type === "tool_execution_end") {
    return {};
  }

  if (value.type !== "message_end") {
    return {};
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

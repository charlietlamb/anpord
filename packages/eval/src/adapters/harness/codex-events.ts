import type { HarnessEvent } from "@anpord/schema/domain/harness-event";
import { Option, Schema } from "effect";
import type { DecodedOutput } from "./session";

const CommandItem = Schema.Struct({
  aggregated_output: Schema.optional(Schema.String),
  command: Schema.String,
  exit_code: Schema.optional(Schema.NullOr(Schema.Number)),
  id: Schema.optional(Schema.String),
  type: Schema.Literal("command_execution"),
});

const MessageItem = Schema.Struct({
  text: Schema.String,
  type: Schema.Literal("agent_message"),
});

const ToolCallItem = Schema.Struct({
  call_id: Schema.optional(Schema.NullOr(Schema.String)),
  input: Schema.optional(Schema.String),
  name: Schema.String,
  status: Schema.optional(Schema.NullOr(Schema.String)),
  type: Schema.Literal("function_call", "custom_tool_call"),
});

const McpToolCallItem = Schema.Struct({
  arguments: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
  error: Schema.optional(
    Schema.NullOr(Schema.Struct({ message: Schema.String }))
  ),
  id: Schema.String,
  result: Schema.optional(
    Schema.NullOr(Schema.Record({ key: Schema.String, value: Schema.Unknown }))
  ),
  server: Schema.String,
  status: Schema.Literal("in_progress", "completed", "failed"),
  tool: Schema.String,
  type: Schema.Literal("mcp_tool_call"),
});

const FileChangeItem = Schema.Struct({
  changes: Schema.Array(Schema.Struct({ path: Schema.String })),
  type: Schema.Literal("file_change"),
});

const Usage = Schema.Struct({
  input_tokens: Schema.Number,
  input_tokens_details: Schema.optional(
    Schema.Struct({ cached_tokens: Schema.optional(Schema.Number) })
  ),
  output_tokens: Schema.Number,
});

const StartedItem = Schema.Struct({
  id: Schema.String,
  type: Schema.Literal("command_execution", "mcp_tool_call"),
});

const CompletedItem = Schema.Union(
  CommandItem,
  MessageItem,
  FileChangeItem,
  ToolCallItem,
  McpToolCallItem
);

const Line = Schema.Union(
  Schema.Struct({
    thread_id: Schema.String,
    type: Schema.Literal("thread.started"),
  }),
  Schema.Struct({
    item: StartedItem,
    type: Schema.Literal("item.started"),
  }),
  Schema.Struct({
    item: CompletedItem,
    type: Schema.Literal("item.completed"),
  }),
  Schema.Struct({
    type: Schema.Literal("turn.completed"),
    usage: Usage,
  }),
  Schema.Struct({
    error: Schema.Struct({ message: Schema.String }),
    type: Schema.Literal("turn.failed"),
  })
);

const decodeLine = Schema.decodeUnknownOption(Schema.parseJson(Line));

const decodeApiError = Schema.decodeUnknownOption(
  Schema.parseJson(
    Schema.Struct({ error: Schema.Struct({ message: Schema.String }) })
  )
);

const failureReasonOf = (message: string) =>
  Option.match(decodeApiError(message), {
    onNone: () => message,
    onSome: (found) => found.error.message,
  });

const itemEvent = (
  item: typeof CompletedItem.Type,
  at: number
): HarnessEvent => {
  switch (item.type) {
    case "command_execution":
      return {
        _tag: "Command",
        at,
        command: item.command,
        exitCode: item.exit_code ?? null,
        output: item.aggregated_output ?? "",
      };
    case "mcp_tool_call":
      return {
        _tag: "ToolCall",
        at,
        callId: item.id,
        input: JSON.stringify(item.arguments),
        name: `${item.server}.${item.tool}`,
        ...(item.result == null ? {} : { output: JSON.stringify(item.result) }),
        ...(item.error == null ? {} : { error: item.error.message }),
        status: item.status,
      };
    case "file_change":
      return {
        _tag: "FileChange",
        at,
        paths: item.changes.map((change) => change.path),
      };
    case "agent_message":
      return { _tag: "Message", at, role: "assistant", text: item.text };
    default:
      return {
        _tag: "ToolCall",
        at,
        callId: item.call_id ?? null,
        input: item.input ?? "",
        name: item.name,
        status: item.status ?? null,
      };
  }
};

const closesOf = (item: typeof CompletedItem.Type) =>
  item.type === "command_execution" || item.type === "mcp_tool_call"
    ? item.id
    : undefined;

const outputOf = (value: typeof Line.Type, at: number): DecodedOutput => {
  switch (value.type) {
    case "thread.started":
      return { sessionId: value.thread_id };
    case "item.started":
      return { opens: value.item.id };
    case "turn.failed": {
      const reason = failureReasonOf(value.error.message);
      return { events: [{ _tag: "Finished", at, reason }], failure: reason };
    }
    case "turn.completed":
      return {
        events: [{ _tag: "Finished", at, reason: "turn.completed" }],
        usage: {
          cacheReadTokens: value.usage.input_tokens_details?.cached_tokens ?? 0,
          cacheWriteTokens: 0,
          inputTokens: value.usage.input_tokens,
          outputTokens: value.usage.output_tokens,
          totalTokens: value.usage.input_tokens + value.usage.output_tokens,
        },
      };
    default:
      return {
        closes: closesOf(value.item),
        events: [itemEvent(value.item, at)],
      };
  }
};

export const decodeCodexLine = (line: string, at: number): DecodedOutput =>
  Option.match(decodeLine(line), {
    onNone: () => ({}),
    onSome: (value) => outputOf(value, at),
  });

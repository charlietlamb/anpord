import { Option, Schema } from "effect";
import type { HarnessEvent, HarnessUsage } from "../../domain/harness-event";

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

const FileChangeItem = Schema.Struct({
  changes: Schema.Array(Schema.Struct({ path: Schema.String })),
  type: Schema.Literal("file_change"),
});

const Usage = Schema.Struct({
  input_tokens: Schema.Number,
  output_tokens: Schema.Number,
});

const StartedItem = Schema.Struct({
  id: Schema.String,
  type: Schema.Literal("command_execution"),
});

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
    item: Schema.Union(CommandItem, MessageItem, FileChangeItem, ToolCallItem),
    type: Schema.Literal("item.completed"),
  }),
  Schema.Struct({
    type: Schema.Literal("turn.completed"),
    usage: Usage,
  })
);

const decodeLine = Schema.decodeUnknownOption(Line);

export interface DecodedLine {
  readonly commandId: Option.Option<string>;
  readonly event: Option.Option<HarnessEvent>;
  readonly started: boolean;
  readonly usage: Option.Option<HarnessUsage>;
}

const none: DecodedLine = {
  commandId: Option.none(),
  event: Option.none(),
  started: false,
  usage: Option.none(),
};

const only = (event: HarnessEvent): DecodedLine => ({
  ...none,
  event: Option.some(event),
});

export const decodeCodexLine = (line: string): DecodedLine => {
  if (line.trim() === "") {
    return none;
  }

  const parsed = Option.liftThrowable(JSON.parse)(line);

  if (Option.isNone(parsed)) {
    return none;
  }

  const decoded = decodeLine(parsed.value);

  if (Option.isNone(decoded)) {
    return none;
  }

  const value = decoded.value;

  if (value.type === "thread.started") {
    return only({
      _tag: "Started",
      model: "codex",
      sessionId: value.thread_id,
    });
  }

  if (value.type === "item.started") {
    return { ...none, commandId: Option.some(value.item.id), started: true };
  }

  if (value.type === "turn.completed") {
    return {
      ...none,
      event: Option.some({ _tag: "Finished", reason: "turn.completed" }),
      usage: Option.some({
        inputTokens: value.usage.input_tokens,
        outputTokens: value.usage.output_tokens,
        totalTokens: value.usage.input_tokens + value.usage.output_tokens,
      }),
    };
  }

  const item = value.item;

  if (item.type === "command_execution") {
    return {
      ...none,
      commandId: Option.fromNullable(item.id),
      event: Option.some({
        _tag: "Command",
        command: item.command,
        exitCode: item.exit_code ?? null,
        output: item.aggregated_output ?? "",
      }),
    };
  }

  if (item.type === "function_call" || item.type === "custom_tool_call") {
    return only({
      _tag: "ToolCall",
      callId: item.call_id ?? null,
      input: item.input ?? "",
      name: item.name,
      status: item.status ?? null,
    });
  }

  if (item.type === "file_change") {
    return only({
      _tag: "FileChange",
      paths: item.changes.map((change) => change.path),
    });
  }

  if (item.type === "agent_message") {
    return only({
      _tag: "Message",
      role: "assistant",
      text: item.text,
    });
  }

  return none;
};

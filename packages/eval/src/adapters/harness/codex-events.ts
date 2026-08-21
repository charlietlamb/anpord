import { Option, Schema } from "effect";
import type { HarnessEvent, HarnessUsage } from "../../domain/harness-event";

/** The shape `codex exec --json` actually emits, captured from a real run
 * rather than taken from documentation. */
const CommandItem = Schema.Struct({
  aggregated_output: Schema.optional(Schema.String),
  command: Schema.String,
  exit_code: Schema.optional(Schema.NullOr(Schema.Number)),
  type: Schema.Literal("command_execution"),
});

const MessageItem = Schema.Struct({
  text: Schema.String,
  type: Schema.Literal("agent_message"),
});

/* Two spellings of the same thing. Codex emits `function_call` for a
   declared tool and `custom_tool_call` for a freeform one, and a scorer
   asking whether a tool ran should not have to know which. */
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

const Line = Schema.Union(
  Schema.Struct({
    thread_id: Schema.String,
    type: Schema.Literal("thread.started"),
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
  readonly event: Option.Option<HarnessEvent>;
  readonly usage: Option.Option<HarnessUsage>;
}

const none: DecodedLine = { event: Option.none(), usage: Option.none() };

/** One NDJSON line to at most one normalised event. */
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
    return {
      event: Option.some({
        _tag: "Started",
        model: "codex",
        sessionId: value.thread_id,
      }),
      usage: Option.none(),
    };
  }

  if (value.type === "turn.completed") {
    return {
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
      event: Option.some({
        _tag: "Command",
        command: item.command,
        exitCode: item.exit_code ?? null,
        output: item.aggregated_output ?? "",
      }),
      usage: Option.none(),
    };
  }

  if (item.type === "function_call" || item.type === "custom_tool_call") {
    return {
      event: Option.some({
        _tag: "ToolCall",
        callId: item.call_id ?? null,
        input: item.input ?? "",
        name: item.name,
        status: item.status ?? null,
      }),
      usage: Option.none(),
    };
  }

  if (item.type === "file_change") {
    return {
      event: Option.some({
        _tag: "FileChange",
        paths: item.changes.map((change) => change.path),
      }),
      usage: Option.none(),
    };
  }

  if (item.type === "agent_message") {
    return {
      event: Option.some({
        _tag: "Message",
        role: "assistant",
        text: item.text,
      }),
      usage: Option.none(),
    };
  }

  /* Matched explicitly rather than falling through. A catch-all here would
     turn any item type added by a later Codex into a message and read a field
     it does not have. */
  return none;
};

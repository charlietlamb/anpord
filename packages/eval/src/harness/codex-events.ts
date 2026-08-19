import { Option, Schema } from "effect";
import type { HarnessEvent, HarnessUsage } from "../ports/harness";

/**
 * The shape `codex exec --json` actually emits, captured from a real run
 * rather than taken from documentation.
 *
 * Only the fields we normalise are declared. Codex adds fields between
 * versions, and a schema that insists on knowing all of them would fail on an
 * upgrade rather than ignore what it does not need.
 */
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
    item: Schema.Union(CommandItem, MessageItem, FileChangeItem),
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

/**
 * One NDJSON line to at most one normalised event.
 *
 * Lines we do not model are dropped rather than failing the stream: `item.started`
 * repeats what `item.completed` says with no exit code yet, and a harness that
 * adds a line type should not end a trial that is otherwise running fine.
 */
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

  if (item.type === "file_change") {
    return {
      event: Option.some({
        _tag: "FileChange",
        paths: item.changes.map((change) => change.path),
      }),
      usage: Option.none(),
    };
  }

  return {
    event: Option.some({ _tag: "Message", role: "assistant", text: item.text }),
    usage: Option.none(),
  };
};

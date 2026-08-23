import { Option, Schema } from "effect";
import type { HarnessEvent, HarnessUsage } from "../../domain/harness-event";

const ToolTime = Schema.Struct({
  end: Schema.optional(Schema.Number),
  start: Schema.optional(Schema.Number),
});

const ToolState = Schema.Struct({
  input: Schema.optional(Schema.Unknown),
  metadata: Schema.optional(Schema.Unknown),
  output: Schema.optional(Schema.String),
  status: Schema.String,
  time: Schema.optional(ToolTime),
});

const Tokens = Schema.Struct({
  input: Schema.Number,
  output: Schema.Number,
  total: Schema.optional(Schema.Number),
});

const Line = Schema.Union(
  Schema.Struct({
    part: Schema.Struct({
      text: Schema.String,
      type: Schema.Literal("text"),
    }),
    sessionID: Schema.String,
    type: Schema.Literal("text"),
  }),
  Schema.Struct({
    part: Schema.Struct({
      callID: Schema.optional(Schema.NullOr(Schema.String)),
      state: ToolState,
      tool: Schema.String,
      type: Schema.Literal("tool"),
    }),
    sessionID: Schema.String,
    type: Schema.Literal("tool_use"),
  }),
  Schema.Struct({
    part: Schema.Struct({
      cost: Schema.optional(Schema.Number),
      reason: Schema.optional(Schema.String),
      tokens: Schema.optional(Tokens),
      type: Schema.Literal("step-finish"),
    }),
    sessionID: Schema.String,
    type: Schema.Literal("step_finish"),
  }),
  Schema.Struct({
    part: Schema.Struct({ type: Schema.Literal("step-start") }),
    sessionID: Schema.String,
    type: Schema.Literal("step_start"),
  }),
  Schema.Struct({
    error: Schema.Unknown,
    sessionID: Schema.optional(Schema.String),
    type: Schema.Literal("error"),
  })
);

const decodeLine = Schema.decodeUnknownOption(Line);

const BashMetadata = Schema.Struct({
  exit: Schema.optional(Schema.Number),
  output: Schema.optional(Schema.String),
});
const decodeBashMetadata = Schema.decodeUnknownOption(BashMetadata);

const BashInput = Schema.Struct({ command: Schema.String });
const decodeBashInput = Schema.decodeUnknownOption(BashInput);

const FileInput = Schema.Struct({ filePath: Schema.String });
const decodeFileInput = Schema.decodeUnknownOption(FileInput);

const WRITES = new Set(["edit", "patch", "write"]);

export interface DecodedLine {
  readonly event: Option.Option<HarnessEvent>;
  readonly sessionId: Option.Option<string>;
  readonly usage: Option.Option<HarnessUsage>;
}

const none: DecodedLine = {
  event: Option.none(),
  sessionId: Option.none(),
  usage: Option.none(),
};

const only = (event: HarnessEvent): DecodedLine => ({
  ...none,
  event: Option.some(event),
});

const startedAtOf = (state: typeof ToolState.Type) =>
  state.time?.start === undefined ? {} : { startedAt: state.time.start };

const commandOf = (
  state: typeof ToolState.Type,
  callId: string | null
): HarnessEvent => {
  const input = decodeBashInput(state.input);
  const metadata = decodeBashMetadata(state.metadata);

  if (Option.isNone(input)) {
    return {
      _tag: "ToolCall",
      callId,
      input: JSON.stringify(state.input ?? null),
      name: "bash",
      status: state.status,
    };
  }

  return {
    _tag: "Command",
    command: input.value.command,
    exitCode: Option.match(metadata, {
      onNone: () => null,
      onSome: (found) => found.exit ?? null,
    }),
    output: state.output ?? "",
    ...startedAtOf(state),
  };
};

const fileChangeOf = (
  state: typeof ToolState.Type,
  tool: string,
  callId: string | null
): HarnessEvent => {
  const input = decodeFileInput(state.input);

  if (Option.isNone(input)) {
    return {
      _tag: "ToolCall",
      callId,
      input: JSON.stringify(state.input ?? null),
      name: tool,
      status: state.status,
    };
  }

  return { _tag: "FileChange", paths: [input.value.filePath] };
};

const toolEventOf = (
  state: typeof ToolState.Type,
  tool: string,
  callId: string | null
): HarnessEvent => {
  if (tool === "bash") {
    return commandOf(state, callId);
  }

  if (WRITES.has(tool)) {
    return fileChangeOf(state, tool, callId);
  }

  return {
    _tag: "ToolCall",
    callId,
    input: JSON.stringify(state.input ?? null),
    name: tool,
    status: state.status,
  };
};

export const decodeOpencodeLine = (line: string): DecodedLine => {
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

  if (value.type === "text") {
    if (value.part.text.trim() === "") {
      return { ...none, sessionId: Option.some(value.sessionID) };
    }

    return {
      ...only({ _tag: "Message", role: "assistant", text: value.part.text }),
      sessionId: Option.some(value.sessionID),
    };
  }

  if (value.type === "tool_use") {
    const { callID, state, tool } = value.part;

    return {
      ...only(toolEventOf(state, tool, callID ?? null)),
      sessionId: Option.some(value.sessionID),
    };
  }

  if (value.type === "step_finish") {
    const tokens = value.part.tokens;

    return {
      event: Option.none(),
      sessionId: Option.some(value.sessionID),
      usage:
        tokens === undefined
          ? Option.none()
          : Option.some({
              inputTokens: tokens.input,
              outputTokens: tokens.output,
              totalTokens: tokens.total ?? tokens.input + tokens.output,
            }),
    };
  }

  if (value.type === "error") {
    return only({
      _tag: "Finished",
      reason: JSON.stringify(value.error),
    });
  }

  return { ...none, sessionId: Option.some(value.sessionID) };
};

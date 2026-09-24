import type { HarnessEvent } from "@anpord/schema/domain/harness-event";
import { Option, Schema } from "effect";
import type { DecodedOutput } from "./session";

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
  cache: Schema.optional(
    Schema.Struct({
      read: Schema.optional(Schema.Number),
      write: Schema.optional(Schema.Number),
    })
  ),
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

const decodeLine = Schema.decodeUnknownOption(Schema.parseJson(Line));

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

const startedAtOf = (state: typeof ToolState.Type) =>
  state.time?.start === undefined ? {} : { startedAt: state.time.start };

const toolCallOf = (
  state: typeof ToolState.Type,
  name: string,
  callId: string | null
): HarnessEvent => ({
  _tag: "ToolCall",
  callId,
  input: JSON.stringify(state.input ?? null),
  name,
  output: state.output,
  ...startedAtOf(state),
  status: state.status,
});

const commandOf = (
  state: typeof ToolState.Type,
  input: typeof BashInput.Type
): HarnessEvent => ({
  _tag: "Command",
  command: input.command,
  exitCode: Option.match(decodeBashMetadata(state.metadata), {
    onNone: () => null,
    onSome: (found) => found.exit ?? null,
  }),
  output: state.output ?? "",
  ...startedAtOf(state),
});

const toolEventOf = (
  state: typeof ToolState.Type,
  tool: string,
  callId: string | null
): HarnessEvent => {
  const fallback = () => toolCallOf(state, tool, callId);

  if (tool === "bash") {
    return Option.match(decodeBashInput(state.input), {
      onNone: fallback,
      onSome: (input) => commandOf(state, input),
    });
  }

  if (WRITES.has(tool)) {
    return Option.match(decodeFileInput(state.input), {
      onNone: fallback,
      onSome: (input): HarnessEvent => ({
        _tag: "FileChange",
        paths: [input.filePath],
      }),
    });
  }

  return fallback();
};

const outputOf = (value: typeof Line.Type): DecodedOutput => {
  switch (value.type) {
    case "text":
      return value.part.text.trim() === ""
        ? { sessionId: value.sessionID }
        : {
            events: [
              { _tag: "Message", role: "assistant", text: value.part.text },
            ],
            sessionId: value.sessionID,
          };
    case "tool_use":
      return {
        events: [
          toolEventOf(
            value.part.state,
            value.part.tool,
            value.part.callID ?? null
          ),
        ],
        sessionId: value.sessionID,
      };
    case "step_finish": {
      const tokens = value.part.tokens;
      return {
        sessionId: value.sessionID,
        usage:
          tokens === undefined
            ? undefined
            : {
                cacheReadTokens: tokens.cache?.read ?? 0,
                cacheWriteTokens: tokens.cache?.write ?? 0,
                inputTokens: tokens.input,
                outputTokens: tokens.output,
                totalTokens: tokens.total ?? tokens.input + tokens.output,
              },
      };
    }
    case "error":
      return {
        events: [{ _tag: "Finished", reason: JSON.stringify(value.error) }],
      };
    default:
      return { sessionId: value.sessionID };
  }
};

export const decodeOpencodeLine = (line: string, at: number): DecodedOutput =>
  Option.match(decodeLine(line), {
    onNone: () => ({}),
    onSome: (value) => {
      const output = outputOf(value);
      return output.events === undefined
        ? output
        : {
            ...output,
            events: output.events.map((event) => ({ ...event, at })),
          };
    },
  });

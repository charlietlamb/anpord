import { Option, Schema } from "effect";
import type { HarnessEvent } from "../../domain/harness-event";
import type { DecodedOutput } from "./support";

const ToolCall = Schema.Struct({
  name: Schema.String,
  status: Schema.String,
});

const Result = Schema.Struct({
  exit_code: Schema.Number,
  model: Schema.String,
  output: Schema.String,
  session_id: Schema.String,
  steps: Schema.Number,
  tool_calls: Schema.Array(ToolCall),
});

const decode = Schema.decodeUnknownOption(Result);

export const decodeFxLine = (line: string, at: number): DecodedOutput => {
  const parsed = Option.liftThrowable(JSON.parse)(line);

  if (Option.isNone(parsed)) {
    return {};
  }

  const found = decode(parsed.value);

  if (Option.isNone(found)) {
    return {};
  }

  const result = found.value;
  const events: HarnessEvent[] = result.tool_calls.map((tool, index) => ({
    _tag: "ToolCall",
    at,
    callId: `${index}`,
    input: "",
    name: tool.name,
    status: tool.status,
  }));

  if (result.output) {
    events.push({
      _tag: "Message",
      at,
      role: "assistant",
      text: result.output,
    });
  }

  events.push({
    _tag: "Finished",
    at,
    reason: `exit:${result.exit_code}`,
  });

  return {
    events,
    model: result.model,
    sessionId: result.session_id || undefined,
  };
};

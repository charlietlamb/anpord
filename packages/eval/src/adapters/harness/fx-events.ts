import type { HarnessEvent } from "@anpord/schema/domain/harness-event";
import { Option, Schema } from "effect";
import type { DecodedOutput } from "./session";

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

const decode = Schema.decodeUnknownOption(Schema.parseJson(Result));

export const decodeFxLine = (line: string, at: number): DecodedOutput => {
  const found = decode(line);

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

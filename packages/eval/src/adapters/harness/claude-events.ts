import { Option, Schema } from "effect";
import type { HarnessEvent, HarnessUsage } from "../../domain/harness-event";
import type { DecodedOutput } from "./support";

const Usage = Schema.Struct({
  cache_creation_input_tokens: Schema.optional(Schema.Number),
  cache_read_input_tokens: Schema.optional(Schema.Number),
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

/* Anthropic reports the cache counts beside the input rather than inside it,
   so a cached turn reads as a small `input_tokens` and a large
   `cache_read_input_tokens`. Both are tokens the model was given, and the
   total counts them: without it a well-cached run reports a fraction of the
   context it actually ran on. */
const usageOf = (usage: typeof Usage.Type): HarnessUsage => {
  const cacheReadTokens = usage.cache_read_input_tokens ?? 0;
  const cacheWriteTokens = usage.cache_creation_input_tokens ?? 0;
  const inputTokens = usage.input_tokens ?? 0;
  const outputTokens = usage.output_tokens ?? 0;

  return {
    cacheReadTokens,
    cacheWriteTokens,
    inputTokens,
    outputTokens,
    totalTokens:
      inputTokens + outputTokens + cacheReadTokens + cacheWriteTokens,
  };
};

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

    /* The closing result restates the whole run, so it replaces the turns
       rather than joining them. */
    return {
      events,
      sessionId: value.session_id,
      usage: value.usage === undefined ? undefined : usageOf(value.usage),
      usageIsCumulative: true,
    };
  }

  const turn =
    value.message.usage === undefined
      ? undefined
      : usageOf(value.message.usage);

  /* The turn's cost rides on its first message, so a reader can see which
     step of a run was the expensive one. Attaching it to every message of a
     multi-part turn would report the same spend once per part. */
  let unspent = turn;

  return {
    events: value.message.content.flatMap((part): readonly HarnessEvent[] => {
      if (part.type === "text" && part.text) {
        const usage = unspent;

        unspent = undefined;

        return [
          { _tag: "Message", at, role: "assistant", text: part.text, usage },
        ];
      }

      return part.type === "tool_use" ? [toolOf(part, at)] : [];
    }),
    sessionId: value.session_id,
    usage: turn,
  };
};

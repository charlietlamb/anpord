import type { HarnessEvent } from "@anpord/schema/domain/harness-event";
import { Option, Schema } from "effect";

const ToolInput = Schema.Struct({
  command: Schema.optional(Schema.String),
  file_path: Schema.optional(Schema.String),
  path: Schema.optional(Schema.String),
});

const decodeToolInput = Schema.decodeUnknownOption(ToolInput);

export interface ToolUse {
  readonly at: number;
  readonly callId: string | undefined;
  readonly input: unknown;
  readonly name: string;
}

export const toolOf =
  (shell: string) =>
  ({ at, callId, input, name }: ToolUse): HarnessEvent => {
    const decoded = Option.getOrElse(
      decodeToolInput(input),
      (): typeof ToolInput.Type => ({})
    );
    const lower = name.toLowerCase();

    if (decoded.command && lower.includes(shell)) {
      return {
        _tag: "Command",
        at,
        command: decoded.command,
        exitCode: null,
        output: "",
      };
    }

    const path = decoded.file_path ?? decoded.path;

    if (path && (lower.includes("write") || lower.includes("edit"))) {
      return { _tag: "FileChange", at, paths: [path] };
    }

    return {
      _tag: "ToolCall",
      at,
      callId: callId ?? null,
      input: JSON.stringify(input ?? null),
      name,
      status: null,
    };
  };

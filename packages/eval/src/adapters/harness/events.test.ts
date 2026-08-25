import { describe, expect, it } from "bun:test";
import { decodeClaudeLine } from "./claude-events";
import { decodeFxLine } from "./fx-events";
import { decodeGeminiLine } from "./gemini-events";
import { decodePiLine } from "./pi-events";

const line = (value: unknown) => JSON.stringify(value);

describe("harness event decoders", () => {
  it("decodes Claude and Qwen stream events", () => {
    expect(
      decodeClaudeLine(
        line({
          model: "claude-sonnet-4-5",
          session_id: "session",
          subtype: "init",
          type: "system",
        }),
        10
      )
    ).toEqual({ model: "claude-sonnet-4-5", sessionId: "session" });

    expect(
      decodeClaudeLine(
        line({
          message: {
            content: [
              {
                id: "tool",
                input: { command: "bun test" },
                name: "Bash",
                type: "tool_use",
              },
            ],
            usage: { input_tokens: 4, output_tokens: 2 },
          },
          session_id: "session",
          type: "assistant",
        }),
        20
      )
    ).toMatchObject({
      events: [{ _tag: "Command", command: "bun test" }],
      usage: { inputTokens: 4, outputTokens: 2, totalTokens: 6 },
    });
  });

  it("decodes Gemini session, tools, and usage", () => {
    expect(
      decodeGeminiLine(
        line({ model: "gemini-2.5-pro", session_id: "session", type: "init" }),
        10
      )
    ).toEqual({ model: "gemini-2.5-pro", sessionId: "session" });

    expect(
      decodeGeminiLine(
        line({
          name: "write_file",
          parameters: { file_path: "src/a.ts" },
          tool_id: "tool",
          type: "tool_use",
        }),
        20
      ).events
    ).toEqual([{ _tag: "FileChange", at: 20, paths: ["src/a.ts"] }]);

    expect(
      decodeGeminiLine(
        line({
          stats: { input_tokens: 3, output_tokens: 5, total_tokens: 8 },
          type: "result",
        }),
        30
      ).usage
    ).toEqual({
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      inputTokens: 3,
      outputTokens: 5,
      totalTokens: 8,
    });
  });

  it("decodes Pi session, commands, files, and usage", () => {
    expect(decodePiLine(line({ id: "session", type: "session" }), 10)).toEqual({
      sessionId: "session",
    });

    expect(
      decodePiLine(
        line({
          args: { command: "pwd" },
          toolCallId: "tool",
          toolName: "bash",
          type: "tool_execution_start",
        }),
        20
      ).events
    ).toEqual([
      { _tag: "Command", at: 20, command: "pwd", exitCode: null, output: "" },
    ]);

    expect(
      decodePiLine(
        line({
          message: {
            content: [{ text: "done", type: "text" }],
            role: "assistant",
            usage: { input: 7, output: 3, totalTokens: 10 },
          },
          type: "message_end",
        }),
        30
      )
    ).toMatchObject({
      events: [{ _tag: "Message", text: "done" }],
      usage: { inputTokens: 7, outputTokens: 3, totalTokens: 10 },
    });
  });

  it("decodes the complete FX result", () => {
    expect(
      decodeFxLine(
        line({
          exit_code: 0,
          model: "openai/gpt-5",
          output: "done",
          session_id: "session",
          steps: 1,
          tool_calls: [{ name: "shell", status: "complete" }],
        }),
        10
      )
    ).toMatchObject({
      events: [
        { _tag: "ToolCall", name: "shell", status: "complete" },
        { _tag: "Message", text: "done" },
        { _tag: "Finished", reason: "exit:0" },
      ],
      model: "openai/gpt-5",
      sessionId: "session",
    });
  });
});

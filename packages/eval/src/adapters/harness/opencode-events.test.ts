import { describe, expect, it } from "bun:test";
import { Option } from "effect";
import { decodeOpencodeLine } from "./opencode-events";

const SESSION = "ses_fd1994f56ffeMiCm5DmYalA0jU";

const line = (value: unknown) => JSON.stringify(value);

const toolLine = (tool: string, state: unknown, callID = "toolu_01") =>
  line({
    part: { callID, state, tool, type: "tool" },
    sessionID: SESSION,
    timestamp: 1,
    type: "tool_use",
  });

describe("decoding an OpenCode line", () => {
  it("reads a shell call as a command with its exit code", () => {
    const decoded = decodeOpencodeLine(
      toolLine("bash", {
        input: { command: "echo hello && ls -a", description: "list" },
        metadata: { exit: 0, output: "hello\n", truncated: false },
        output: "hello\n",
        status: "completed",
        time: { end: 1_787_484_881_295, start: 1_787_484_881_294 },
      })
    );

    expect(Option.getOrThrow(decoded.event)).toEqual({
      _tag: "Command",
      command: "echo hello && ls -a",
      exitCode: 0,
      output: "hello\n",
      startedAt: 1_787_484_881_294,
    });
  });

  it("keeps a non-zero exit rather than reporting success", () => {
    const decoded = decodeOpencodeLine(
      toolLine("bash", {
        input: { command: "exit 3" },
        metadata: { exit: 3, output: "" },
        status: "completed",
      })
    );

    expect(Option.getOrThrow(decoded.event)).toMatchObject({
      _tag: "Command",
      exitCode: 3,
    });
  });

  it("reports an unknown exit as null", () => {
    const decoded = decodeOpencodeLine(
      toolLine("bash", {
        input: { command: "true" },
        metadata: {},
        status: "completed",
      })
    );

    expect(Option.getOrThrow(decoded.event)).toMatchObject({
      exitCode: null,
    });
  });

  it("reads a write as a file change", () => {
    const decoded = decodeOpencodeLine(
      toolLine("write", {
        input: { content: "done", filePath: "/w/notes.txt" },
        status: "completed",
      })
    );

    expect(Option.getOrThrow(decoded.event)).toEqual({
      _tag: "FileChange",
      paths: ["/w/notes.txt"],
    });
  });

  it("keeps any other tool as a call", () => {
    const decoded = decodeOpencodeLine(
      toolLine("todowrite", { input: { todos: [] }, status: "completed" })
    );

    expect(Option.getOrThrow(decoded.event)).toMatchObject({
      _tag: "ToolCall",
      callId: "toolu_01",
      name: "todowrite",
      status: "completed",
    });
  });

  it("reads assistant text as a message", () => {
    const decoded = decodeOpencodeLine(
      line({
        part: { text: "I'll help with that.", type: "text" },
        sessionID: SESSION,
        type: "text",
      })
    );

    expect(Option.getOrThrow(decoded.event)).toMatchObject({
      _tag: "Message",
      role: "assistant",
      text: "I'll help with that.",
    });
  });

  it("drops an empty message but still reports the session", () => {
    const decoded = decodeOpencodeLine(
      line({
        part: { text: "   ", type: "text" },
        sessionID: SESSION,
        type: "text",
      })
    );

    expect(Option.isNone(decoded.event)).toBe(true);
    expect(Option.getOrThrow(decoded.sessionId)).toBe(SESSION);
  });

  it("reads usage from a finished step", () => {
    const decoded = decodeOpencodeLine(
      line({
        part: {
          cost: 0.0024,
          reason: "stop",
          tokens: {
            cache: { read: 20_986, write: 355 },
            input: 2,
            output: 160,
            reasoning: 0,
            total: 21_503,
          },
          type: "step-finish",
        },
        sessionID: SESSION,
        type: "step_finish",
      })
    );

    expect(Option.getOrThrow(decoded.usage)).toEqual({
      cacheReadTokens: 20_986,
      cacheWriteTokens: 355,
      inputTokens: 2,
      outputTokens: 160,
      totalTokens: 21_503,
    });
  });

  it("reads an error as a finish carrying its reason", () => {
    const decoded = decodeOpencodeLine(
      line({ error: { name: "ProviderModelNotFoundError" }, type: "error" })
    );

    expect(Option.getOrThrow(decoded.event)).toMatchObject({
      _tag: "Finished",
    });
  });

  it.each([
    ["an empty line", ""],
    ["a line that is not JSON", "Performing one time database migration..."],
    ["a shape from a later version", line({ type: "unheard_of" })],
  ])("yields nothing for %s", (_label, value) => {
    const decoded = decodeOpencodeLine(value);

    expect(Option.isNone(decoded.event)).toBe(true);
    expect(Option.isNone(decoded.usage)).toBe(true);
  });
});

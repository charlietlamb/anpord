import { describe, expect, it } from "bun:test";
import { decodeOpencodeLine } from "../../../src/adapters/harness/opencode-events";

const SESSION = "ses_fd1994f56ffeMiCm5DmYalA0jU";

const line = (value: unknown) => JSON.stringify(value);

const toolLine = (tool: string, state: unknown, callID = "toolu_01") =>
  line({
    part: { callID, state, tool, type: "tool" },
    sessionID: SESSION,
    timestamp: 1,
    type: "tool_use",
  });

const decode = (value: string) => decodeOpencodeLine(value, 5);

const eventOf = (value: string) => decode(value).events?.[0];

describe("decoding an OpenCode line", () => {
  it("reads a shell call as a command with its exit code", () => {
    const event = eventOf(
      toolLine("bash", {
        input: { command: "echo hello && ls -a", description: "list" },
        metadata: { exit: 0, output: "hello\n", truncated: false },
        output: "hello\n",
        status: "completed",
        time: { end: 1_787_484_881_295, start: 1_787_484_881_294 },
      })
    );

    expect(event).toEqual({
      _tag: "Command",
      at: 5,
      command: "echo hello && ls -a",
      exitCode: 0,
      output: "hello\n",
      startedAt: 1_787_484_881_294,
    });
  });

  it("keeps a non-zero exit rather than reporting success", () => {
    const event = eventOf(
      toolLine("bash", {
        input: { command: "exit 3" },
        metadata: { exit: 3, output: "" },
        status: "completed",
      })
    );

    expect(event).toMatchObject({
      _tag: "Command",
      exitCode: 3,
    });
  });

  it("reports an unknown exit as null", () => {
    const event = eventOf(
      toolLine("bash", {
        input: { command: "true" },
        metadata: {},
        status: "completed",
      })
    );

    expect(event).toMatchObject({
      exitCode: null,
    });
  });

  it("reads a write as a file change", () => {
    const event = eventOf(
      toolLine("write", {
        input: { content: "done", filePath: "/w/notes.txt" },
        status: "completed",
      })
    );

    expect(event).toEqual({
      _tag: "FileChange",
      at: 5,
      paths: ["/w/notes.txt"],
    });
  });

  it("keeps any other tool as a call", () => {
    const event = eventOf(
      toolLine("todowrite", {
        input: { todos: [] },
        output: "Saved",
        status: "completed",
      })
    );

    expect(event).toMatchObject({
      _tag: "ToolCall",
      callId: "toolu_01",
      name: "todowrite",
      output: "Saved",
      status: "completed",
    });
  });

  it("reads assistant text as a message", () => {
    const event = eventOf(
      line({
        part: { text: "I'll help with that.", type: "text" },
        sessionID: SESSION,
        type: "text",
      })
    );

    expect(event).toMatchObject({
      _tag: "Message",
      role: "assistant",
      text: "I'll help with that.",
    });
  });

  it("drops an empty message but still reports the session", () => {
    const decoded = decode(
      line({
        part: { text: "   ", type: "text" },
        sessionID: SESSION,
        type: "text",
      })
    );

    expect(decoded).toEqual({ sessionId: SESSION });
  });

  it("reads usage from a finished step", () => {
    const decoded = decode(
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

    expect(decoded.usage).toEqual({
      cacheReadTokens: 20_986,
      cacheWriteTokens: 355,
      inputTokens: 2,
      outputTokens: 160,
      totalTokens: 21_503,
    });
  });

  it("reads an error as a finish carrying its reason", () => {
    const event = eventOf(
      line({ error: { name: "ProviderModelNotFoundError" }, type: "error" })
    );

    expect(event).toMatchObject({
      _tag: "Finished",
    });
  });

  it.each([
    ["an empty line", ""],
    ["a line that is not JSON", "Performing one time database migration..."],
    ["a shape from a later version", line({ type: "unheard_of" })],
  ])("yields nothing for %s", (_label, value) => {
    expect(decode(value)).toEqual({});
  });
});

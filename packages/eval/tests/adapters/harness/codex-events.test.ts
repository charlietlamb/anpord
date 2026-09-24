import { describe, expect, it } from "bun:test";
import { decodeCodexLine } from "../../../src/adapters/harness/codex-events";

const THREAD = '{"type":"thread.started","thread_id":"01a01a91-dfd4-7950"}';
const COMMAND =
  '{"type":"item.completed","item":{"id":"item_6","type":"command_execution","command":"/bin/zsh -lc \'bun test\'","aggregated_output":"1 pass\\n","exit_code":0,"status":"completed"}}';
const FAILED =
  '{"type":"item.completed","item":{"id":"item_1","type":"command_execution","command":"bun test","aggregated_output":"expect(5).toBe(6)\\n","exit_code":1,"status":"failed"}}';
const FILE =
  '{"type":"item.completed","item":{"id":"item_5","type":"file_change","changes":[{"path":"/tmp/total.ts","kind":"update"}],"status":"completed"}}';
const TURN_FAILED =
  '{"type":"turn.failed","error":{"message":"{\\"type\\":\\"error\\",\\"status\\":400,\\"error\\":{\\"type\\":\\"invalid_request_error\\",\\"message\\":\\"The gpt-5.2 model is not supported when using Codex with a ChatGPT account.\\"}}"}}';
const TURN =
  '{"type":"turn.completed","usage":{"input_tokens":98371,"cached_input_tokens":87552,"output_tokens":757,"reasoning_output_tokens":175}}';

const decoded = (line: string) => decodeCodexLine(line, 0);

const eventOf = (line: string) => decoded(line).events?.[0];

describe("decodeCodexLine", () => {
  it("keeps the reason a turn failed, not the wrapper around it", () => {
    const event = eventOf(TURN_FAILED);

    expect(event).toMatchObject({
      _tag: "Finished",
      reason:
        "The gpt-5.2 model is not supported when using Codex with a ChatGPT account.",
    });
  });

  it("reads the session id from the opening line", () => {
    expect(decoded(THREAD).sessionId).toBe("01a01a91-dfd4-7950");
  });

  it("keeps the exit code of a command", () => {
    const passed = eventOf(COMMAND);
    const failed = eventOf(FAILED);

    expect(passed).toMatchObject({ _tag: "Command", exitCode: 0 });
    expect(failed).toMatchObject({ _tag: "Command", exitCode: 1 });
  });

  it("keeps the files the agent changed", () => {
    const event = eventOf(FILE);

    expect(event).toMatchObject({
      _tag: "FileChange",
      paths: ["/tmp/total.ts"],
    });
  });

  it("reads usage from the closing line", () => {
    const usage = decoded(TURN).usage;

    expect(usage?.inputTokens).toBe(98_371);
    expect(usage?.outputTokens).toBe(757);
    expect(usage?.totalTokens).toBe(99_128);
  });

  it("drops a line it does not model", () => {
    expect(decoded('{"type":"turn.started"}')).toEqual({});
    expect(decoded("not json")).toEqual({});
    expect(decoded("")).toEqual({});
  });
});

describe("tool calls", () => {
  it("retains MCP results and errors", () => {
    const result = { content: [{ type: "text", text: "Fixture" }] };
    for (const response of [
      { result },
      { error: { message: "Unknown item" } },
    ]) {
      const event = eventOf(
        JSON.stringify({
          type: "item.completed",
          item: {
            type: "mcp_tool_call",
            id: "call_1",
            server: "catalog",
            tool: "get",
            arguments: { id: "fixture" },
            status: "completed",
            ...response,
          },
        })
      );
      expect(event).toMatchObject(
        "result" in response
          ? { output: JSON.stringify(result) }
          : { error: "Unknown item" }
      );
    }
  });

  it.each(["completed", "failed"])("records %s MCP tool calls", (status) => {
    const event = eventOf(
      JSON.stringify({
        type: "item.completed",
        item: {
          type: "mcp_tool_call",
          id: "item_1",
          server: "inventory",
          tool: "lookup",
          arguments: { id: "fixture" },
          status,
        },
      })
    );

    expect(event).toEqual({
      _tag: "ToolCall",
      at: 0,
      callId: "item_1",
      input: '{"id":"fixture"}',
      name: "inventory.lookup",
      status,
    });
  });

  it("decodes a custom tool call", () => {
    const event = eventOf(
      JSON.stringify({
        item: {
          call_id: "call_TGMfN3Hvd3b2OUEWMvEw6KAv",
          input: '{"cmd":"sed -n 1,240p SKILL.md"}',
          name: "exec",
          status: "completed",
          type: "custom_tool_call",
        },
        type: "item.completed",
      })
    );

    expect(event).toEqual({
      _tag: "ToolCall",
      at: 0,
      callId: "call_TGMfN3Hvd3b2OUEWMvEw6KAv",
      input: '{"cmd":"sed -n 1,240p SKILL.md"}',
      name: "exec",
      status: "completed",
    });
  });

  it("decodes a declared function call the same way", () => {
    const event = eventOf(
      JSON.stringify({
        item: { name: "read_file", type: "function_call" },
        type: "item.completed",
      })
    );

    expect(event).toMatchObject({
      _tag: "ToolCall",
      callId: null,
      name: "read_file",
    });
  });

  it("drops an unknown item type rather than guessing", () => {
    const event = eventOf(
      JSON.stringify({
        item: { type: "something_new_in_a_later_version" },
        type: "item.completed",
      })
    );

    expect(event).toBeUndefined();
  });
});

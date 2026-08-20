import { describe, expect, it } from "bun:test";
import { Option } from "effect";
import { decodeCodexLine } from "../../src/harness/codex-events";

/* Verbatim lines from a real `codex exec --json` run, so a change in the
   harness's output shape breaks this test rather than silently emptying a
   journal in production. */
const THREAD = '{"type":"thread.started","thread_id":"01a01a91-dfd4-7950"}';
const COMMAND =
  '{"type":"item.completed","item":{"id":"item_6","type":"command_execution","command":"/bin/zsh -lc \'bun test\'","aggregated_output":"1 pass\\n","exit_code":0,"status":"completed"}}';
const FAILED =
  '{"type":"item.completed","item":{"id":"item_1","type":"command_execution","command":"bun test","aggregated_output":"expect(5).toBe(6)\\n","exit_code":1,"status":"failed"}}';
const FILE =
  '{"type":"item.completed","item":{"id":"item_5","type":"file_change","changes":[{"path":"/tmp/total.ts","kind":"update"}],"status":"completed"}}';
const TURN =
  '{"type":"turn.completed","usage":{"input_tokens":98371,"cached_input_tokens":87552,"output_tokens":757,"reasoning_output_tokens":175}}';

describe("decodeCodexLine", () => {
  it("reads the session id from the opening line", () => {
    const event = Option.getOrThrow(decodeCodexLine(THREAD).event);

    expect(event._tag).toBe("Started");
  });

  /* The column an eval platform reading a tool-call string cannot have. */
  it("keeps the exit code of a command", () => {
    const passed = Option.getOrThrow(decodeCodexLine(COMMAND).event);
    const failed = Option.getOrThrow(decodeCodexLine(FAILED).event);

    expect(passed).toMatchObject({ _tag: "Command", exitCode: 0 });
    expect(failed).toMatchObject({ _tag: "Command", exitCode: 1 });
  });

  it("keeps the files the agent changed", () => {
    const event = Option.getOrThrow(decodeCodexLine(FILE).event);

    expect(event).toMatchObject({
      _tag: "FileChange",
      paths: ["/tmp/total.ts"],
    });
  });

  it("reads usage from the closing line", () => {
    const decoded = decodeCodexLine(TURN);
    const usage = Option.getOrThrow(decoded.usage);

    expect(usage.inputTokens).toBe(98_371);
    expect(usage.outputTokens).toBe(757);
    expect(usage.totalTokens).toBe(99_128);
  });

  /* A harness that adds a line type must not end a trial that is otherwise
     running fine, so unknown and malformed lines are dropped rather than
     failing the stream. */
  it("drops a line it does not model", () => {
    expect(
      Option.isNone(decodeCodexLine('{"type":"turn.started"}').event)
    ).toBe(true);
    expect(Option.isNone(decodeCodexLine("not json").event)).toBe(true);
    expect(Option.isNone(decodeCodexLine("").event)).toBe(true);
  });
});

describe("tool calls", () => {
  /* The payload shape taken from a real Codex session transcript, where
     function calls outnumbered shell executions sixteen to one. */
  it("decodes a custom tool call", () => {
    const decoded = decodeCodexLine(
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

    expect(Option.isSome(decoded.event)).toBe(true);

    if (Option.isNone(decoded.event)) {
      return;
    }

    expect(decoded.event.value).toEqual({
      _tag: "ToolCall",
      callId: "call_TGMfN3Hvd3b2OUEWMvEw6KAv",
      input: '{"cmd":"sed -n 1,240p SKILL.md"}',
      name: "exec",
      status: "completed",
    });
  });

  it("decodes a declared function call the same way", () => {
    const decoded = decodeCodexLine(
      JSON.stringify({
        item: { name: "read_file", type: "function_call" },
        type: "item.completed",
      })
    );

    expect(Option.isSome(decoded.event)).toBe(true);

    if (Option.isNone(decoded.event)) {
      return;
    }

    expect(decoded.event.value).toMatchObject({
      _tag: "ToolCall",
      callId: null,
      name: "read_file",
    });
  });

  /* A later Codex adding an item type must be ignored, never coerced into a
     message with a field it does not have. */
  it("drops an unknown item type rather than guessing", () => {
    const decoded = decodeCodexLine(
      JSON.stringify({
        item: { type: "something_new_in_a_later_version" },
        type: "item.completed",
      })
    );

    expect(Option.isNone(decoded.event)).toBe(true);
  });
});

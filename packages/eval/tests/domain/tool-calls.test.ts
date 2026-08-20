import { describe, expect, it } from "bun:test";
import type { HarnessEvent } from "../../src/domain/harness-event";
import {
  calledAll,
  calledAny,
  lastToolCallIn,
  toolCallsIn,
} from "../../src/domain/journal";

const tool = (name: string): HarnessEvent => ({
  _tag: "ToolCall",
  callId: `call_${name}`,
  input: "{}",
  name,
  status: "completed",
});

const journal: readonly HarnessEvent[] = [
  { _tag: "Started", model: "gpt-5-codex", sessionId: "s1" },
  tool("read_file"),
  { _tag: "Command", command: "bun test", exitCode: 1, output: "fail" },
  tool("apply_patch"),
  tool("read_file"),
  { _tag: "Finished", reason: "turn.completed" },
];

describe("tool calls in a journal", () => {
  it("reads them in order, keeping repeats", () => {
    expect(toolCallsIn(journal)).toEqual([
      "read_file",
      "apply_patch",
      "read_file",
    ]);
  });

  /** PostHog's RequiredToolCall, Onyx's ToolAssertion with require_all. */
  it("answers whether every required tool was called", () => {
    expect(calledAll(journal, ["read_file", "apply_patch"])).toBe(true);
    expect(calledAll(journal, ["read_file", "web_search"])).toBe(false);
  });

  /** PostHog's NoToolCall, DeerFlow's forbidden_tool_actions. Returns the
   * offenders so a failure names what happened. */
  it("names which forbidden tools were called", () => {
    expect(calledAny(journal, ["web_search", "apply_patch"])).toEqual([
      "apply_patch",
    ]);
    expect(calledAny(journal, ["web_search"])).toEqual([]);
  });

  /** PostHog's LastToolCallNot. */
  it("reads the last tool invoked", () => {
    expect(lastToolCallIn(journal)).toBe("read_file");
    expect(lastToolCallIn([])).toBeNull();
  });

  it("ignores shell commands, which are not tool calls", () => {
    const shellOnly: readonly HarnessEvent[] = [
      { _tag: "Command", command: "ls", exitCode: 0, output: "" },
    ];

    expect(toolCallsIn(shellOnly)).toEqual([]);
    expect(calledAll(shellOnly, ["ls"])).toBe(false);
  });
});

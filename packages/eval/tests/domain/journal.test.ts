import { describe, expect, it } from "bun:test";
import type { HarnessEvent } from "../../src/domain/harness-event";
import {
  answerOf,
  calledAll,
  calledAny,
  lastToolCallIn,
  toolCallsIn,
  transcriptOf,
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

  /** A required tool call, and an assertion that every one of a set ran. */
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

const said = (role: "assistant" | "user", text: string): HarnessEvent => ({
  _tag: "Message",
  role,
  text,
});

const spoken: readonly HarnessEvent[] = [
  { _tag: "Started", model: "gpt-5-codex", sessionId: "s1" },
  said("user", "How many planets?"),
  said("assistant", "Let me check."),
  tool("read_file"),
  { _tag: "Command", command: "ls", exitCode: 0, output: "" },
  said("assistant", "There are eight."),
  { _tag: "Finished", reason: "turn.completed" },
];

describe("what the agent said", () => {
  it("is the last assistant message, not the last message", () => {
    expect(answerOf(spoken)).toBe("There are eight.");
  });

  /* A harness that ends on the user's turn, or a case whose agent answered
     only by writing a file. Empty rather than absent, so a validator never has
     to tell "said nothing" from "nothing was written". */
  it("is empty when the agent never spoke", () => {
    expect(answerOf([])).toBe("");
    expect(answerOf([said("user", "hello")])).toBe("");
  });

  it("ignores the user's own words", () => {
    expect(answerOf([said("assistant", "mine"), said("user", "yours")])).toBe(
      "mine"
    );
  });
});

describe("the whole transcript", () => {
  it("joins every assistant message, newest last", () => {
    expect(transcriptOf(spoken)).toBe("Let me check.\n\nThere are eight.");
  });

  it("skips the tool calls and commands between them", () => {
    expect(transcriptOf(journal)).toBe("");
  });

  it("is empty for a journal with no messages", () => {
    expect(transcriptOf([])).toBe("");
  });

  /* The answer is the tail of the transcript, so a case can assert on either
     without the two disagreeing about what was said last. */
  it("ends with the answer", () => {
    expect(transcriptOf(spoken).endsWith(answerOf(spoken))).toBe(true);
  });
});

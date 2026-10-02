import { describe, expect, it } from "bun:test";
import type { HarnessEvent } from "@sphynx/schema/domain/harness-event";
import { asEntries, cutToJournal } from "../../src/domain/journal-entries";

const patch: HarnessEvent = {
  _tag: "ToolCall",
  callId: "call_1",
  error: "c".repeat(5000),
  input: "a".repeat(10_000),
  name: "apply_patch",
  output: "b".repeat(4001),
  status: "failed",
};

describe("an event cut to what the journal shows", () => {
  it("keeps every character the journal shows, and says what was cut", () => {
    const cut = cutToJournal(patch);

    expect(
      cut._tag === "ToolCall"
        ? [
            cut.input.slice(4000),
            cut.output?.slice(4000),
            cut.error?.slice(4000),
          ]
        : []
    ).toEqual([
      "\n[the rest was cut before this was sent, 10000 characters in all]",
      "\n[the rest was cut before this was sent, 4001 characters in all]",
      "\n[the rest was cut before this was sent, 5000 characters in all]",
    ]);
    expect(asEntries(cut)).toEqual(asEntries(patch));
  });

  it("shows the first 4000 characters of a long command, flagged as cut", () => {
    const install: HarnessEvent = {
      _tag: "Command",
      command: "bun install",
      exitCode: 0,
      output: "d".repeat(900_000),
    };

    expect(
      asEntries(cutToJournal(install)).map((entry) =>
        entry._tag === "command"
          ? [entry.output.length, entry.outputTruncated]
          : []
      )
    ).toEqual([[4000, true]]);
  });

  it("leaves a command whose output fits as it was", () => {
    const command: HarnessEvent = {
      _tag: "Command",
      command: "bun test",
      exitCode: 0,
      output: "12 pass",
    };

    expect(cutToJournal(command)).toEqual(command);
  });
});

describe("a tool call that fits", () => {
  it("is left as it was, error included", () => {
    const failed: HarnessEvent = {
      _tag: "ToolCall",
      callId: "call_2",
      error: "no such file",
      input: "{}",
      name: "read_file",
      status: "failed",
    };

    expect(cutToJournal(failed)).toEqual(failed);
  });
});

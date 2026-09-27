import { describe, expect, it } from "bun:test";
import type { HarnessEvent } from "@anpord/schema/domain/harness-event";
import { asEntries, cutToJournal } from "../../src/domain/journal-entries";

const patch: HarnessEvent = {
  _tag: "ToolCall",
  callId: "call_1",
  error: "no such file",
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
        ? [cut.input.slice(4000), cut.output?.slice(4000), cut.error]
        : []
    ).toEqual([
      "\n[the rest was cut before this was sent, 10000 characters in all]",
      "\n[the rest was cut before this was sent, 4001 characters in all]",
      "no such file",
    ]);
    expect(asEntries(cut)).toEqual(asEntries(patch));
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

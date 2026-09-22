import { describe, expect, test } from "bun:test";
import type { EvalJournalEntry } from "@anpord/schema/domain/evals";
import { formatEntry, opensTurn } from "../../src/cli/eval-activity";

const ESCAPE = String.fromCharCode(27);

const message = (
  role: "assistant" | "user",
  text: string
): EvalJournalEntry => ({
  _tag: "message",
  finishedAtMillis: null,
  role,
  text,
  usage: null,
});

const command = (text: string, exitCode = 0): EvalJournalEntry => ({
  _tag: "command",
  command: `/bin/bash -lc '${text}'`,
  exitCode,
  finishedAtMillis: null,
  output: "",
  startedAtMillis: null,
});

describe("activity", () => {
  test("names each side of the conversation", () => {
    expect(formatEntry(message("user", "go ahead"))).toBe("› user go ahead");
    expect(formatEntry(message("assistant", "shall I push?"))).toBe(
      "‹ agent shall I push?"
    );
  });

  test("shows what was said whole, and cuts a command to the line", () => {
    const long = "word ".repeat(40).trim();

    expect(formatEntry(message("assistant", long))).toBe(`‹ agent ${long}`);
    expect(formatEntry(command(long)).length).toBeLessThan(80);
  });

  test("shows a command without the shell that ran it, and how it failed", () => {
    expect(formatEntry(command("npx atmn push"))).toBe("$ npx atmn push");
    expect(formatEntry(command("bun test", 1))).toBe("$ bun test exit 1");
  });

  test("breaks the log where the person speaks", () => {
    expect(opensTurn(message("user", "yes"))).toBe(true);
    expect(opensTurn(message("assistant", "ok"))).toBe(false);
  });

  test("keeps escapes out of a log and puts them in a terminal", () => {
    const entry = message("user", "yes");

    expect(formatEntry(entry)).not.toContain(ESCAPE);
    expect(formatEntry(entry, { colour: true, width: 80 })).toContain(ESCAPE);
  });
});

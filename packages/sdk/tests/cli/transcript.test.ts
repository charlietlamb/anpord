import { describe, expect, test } from "bun:test";
import type { EvalJournalEntry } from "@anpord/schema/domain/evals";
import {
  EMPTY_TRANSCRIPT,
  PLAIN,
  settle,
  transcribe,
} from "../../src/cli/transcript";

const speaker = {
  caseName: "asks before it pushes",
  key: "cel_1#1",
  ordinal: null,
  variant: "codex/gpt-5.6-terra",
};

const other = { ...speaker, key: "cel_2#1", variant: "claude/opus" };

const said = (text: string, at: number): EvalJournalEntry => ({
  _tag: "message",
  finishedAtMillis: at,
  role: "user",
  text,
  usage: null,
});

const replied = (
  text: string,
  at: number,
  costUsd: number | null = null
): EvalJournalEntry => ({
  _tag: "message",
  finishedAtMillis: at,
  role: "assistant",
  text,
  usage:
    costUsd === null
      ? null
      : {
          cacheReadTokens: 0,
          cacheWriteTokens: 0,
          costUsd,
          inputTokens: 1,
          outputTokens: 1,
          totalTokens: 2,
        },
});

const tool = (name: string, input: string): EvalJournalEntry => ({
  _tag: "toolCall",
  finishedAtMillis: null,
  input,
  name,
  status: null,
});

const run = (entries: readonly EvalJournalEntry[], who = speaker) =>
  transcribe(
    EMPTY_TRANSCRIPT,
    entries.map((entry) => ({ entry, speaker: who })),
    PLAIN
  );

describe("the transcript a reader follows", () => {
  test("opens a trial with its case and variant", () => {
    const { lines } = run([said("go", 0)]);

    expect(lines[0]).toBe("  ┌ asks before it pushes · codex/gpt-5.6-terra");
  });

  test("gives each speaker a block and keeps the whole message", () => {
    const long = "word ".repeat(60).trim();
    const { lines } = run([said(long, 0)]);
    const body = lines.filter((line) => line.startsWith("  │   "));

    expect(lines).toContain("  │ user");
    expect(body.length).toBeGreaterThan(1);
    expect(body.join(" ").replaceAll("  │   ", "").split(" ")).toHaveLength(60);
  });

  test("keeps the structure an agent wrote", () => {
    const { lines } = run([replied("[ ] one\n[X] two", 1)]);

    expect(lines).toContain("  │   [ ] one");
    expect(lines).toContain("  │   [X] two");
  });

  test("names what a tool call acted on", () => {
    const { lines } = run([
      tool("skill", JSON.stringify({ skill: "autumn:autumn-setup" })),
    ]);

    expect(lines.at(-1)).toBe("  │ ● skill autumn:autumn-setup");
  });

  test("closes a turn with its duration and spend when the next one opens", () => {
    const { lines } = run([
      said("hey", 1000),
      replied("what price?", 23_300, 0.04),
      said("$20", 30_000),
    ]);

    expect(lines).toContain("  │ ✓ turn 1 · 22.3s · $0.04");
  });

  test("closes the last turn once the trial settles", () => {
    const opened = run([said("hey", 0), replied("done", 5000)]);
    const { lines } = settle(opened.transcript, [speaker.key], PLAIN);

    expect(lines).toEqual(["  │", "  │ ✓ turn 1 · 5.0s"]);
    expect(settle(opened.transcript, [], PLAIN).lines).toEqual([]);
  });

  test("says when a turn ended without a reply", () => {
    const opened = run([said("hey", 0)]);
    const { lines } = settle(opened.transcript, [speaker.key], PLAIN);

    expect(lines.at(-1)).toBe("  │ · turn 1 · no reply");
  });

  test("names the trial again whenever the speaker changes", () => {
    const first = run([said("a", 0)]);
    const { lines } = transcribe(
      first.transcript,
      [{ entry: said("b", 0), speaker: other }],
      PLAIN
    );

    expect(lines[0]).toBe("");
    expect(lines[1]).toContain("claude/opus");
  });

  test("paints for a terminal and never for a log", () => {
    const ansi = String.fromCharCode(27);

    expect(run([said("go", 0)]).lines.join("")).not.toContain(ansi);
    expect(
      transcribe(EMPTY_TRANSCRIPT, [{ entry: said("go", 0), speaker }], {
        colour: true,
        width: 80,
      }).lines.join("")
    ).toContain(ansi);
  });
});

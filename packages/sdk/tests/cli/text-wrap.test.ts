import { describe, expect, test } from "bun:test";
import { wrapText } from "../../src/cli/text-wrap";

describe("wrapping text for a terminal", () => {
  test("breaks at words within the width", () => {
    const lines = wrapText("one two three four five six", 20);

    expect(lines).toEqual(["one two three four", "five six"]);
  });

  test("keeps an indented line indented when it wraps", () => {
    const lines = wrapText(`    ${"item ".repeat(8).trim()}`, 24);

    expect(lines.every((line) => line.startsWith("    "))).toBe(true);
  });

  test("keeps one blank line between paragraphs and none at the ends", () => {
    expect(wrapText("\n\nfirst\n\n\n\nsecond\n\n", 40)).toEqual([
      "first",
      "",
      "second",
    ]);
  });
});

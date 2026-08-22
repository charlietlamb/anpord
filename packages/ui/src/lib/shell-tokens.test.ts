import { describe, expect, it } from "bun:test";
import { shellTokens } from "./shell-tokens";

const joined = (source: string) =>
  shellTokens(source)
    .map((token) => token.value)
    .join("");

describe("shellTokens", () => {
  /** The property that matters: highlighting must never change the text it
   * highlights. Everything else is cosmetic; losing a character is a lie
   * about what ran. */
  it("loses nothing, whatever the input", () => {
    const commands = [
      `/bin/sh -lc "pwd && rg --files -g 'AGENTS.md' | sed -n '1,160p'"`,
      `for logo in a.svg b.svg; do printf '%s  ' "$logo"; wc -c < "$logo"; done`,
      `node -e "const fs=require('fs'); if (!s.startsWith('<svg')) process.exit(1);"`,
      "git diff --check && git status --short",
      "# a comment\nls -la",
      `echo "unterminated`,
      `echo 'unterminated`,
      "",
      "()|&;<>",
    ];

    for (const command of commands) {
      expect(joined(command)).toBe(command);
    }
  });

  it("finds strings, flags and operators", () => {
    const tokens = shellTokens(`rg --files -g 'x' | sort`);
    const kinds = new Set(tokens.map((token) => token.kind));

    expect(kinds.has("flag")).toBe(true);
    expect(kinds.has("string")).toBe(true);
    expect(kinds.has("operator")).toBe(true);
  });

  /** A flag inside a string belongs to the string. Matching flags first would
   * paint the inside of a quoted argument. */
  it("does not find flags inside strings", () => {
    const tokens = shellTokens(`echo "--not-a-flag"`);

    expect(tokens.some((token) => token.kind === "flag")).toBe(false);
  });

  /** The bug this was written for: `-light` sits inside a filename, and
   * matching a hyphen anywhere painted half a path as a flag. */
  it("does not find flags inside a filename", () => {
    const tokens = shellTokens("test -f public/logos/github-light.svg");
    const flags = tokens
      .filter((token) => token.kind === "flag")
      .map((token) => token.value);

    expect(flags).toEqual(["-f"]);
  });

  it("treats a negative number as text, not a flag", () => {
    const tokens = shellTokens("sleep -5");

    expect(tokens.some((token) => token.kind === "flag")).toBe(false);
  });
});

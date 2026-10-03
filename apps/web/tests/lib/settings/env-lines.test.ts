import { describe, expect, it } from "bun:test";
import {
  looksLikeEnv,
  parseEnvLines,
} from "../../../src/lib/settings/env-lines";

describe("env lines", () => {
  it("reads KEY=VALUE lines and skips comments and blank lines", () => {
    expect(
      parseEnvLines(
        "OPENAI_API_KEY=sk-1\n\n# a comment\n  BASE_URL = https://x "
      )
    ).toEqual([
      { name: "OPENAI_API_KEY", value: "sk-1" },
      { name: "BASE_URL", value: "https://x" },
    ]);
  });

  it("drops a leading export", () => {
    expect(parseEnvLines("export API_KEY=abc")).toEqual([
      { name: "API_KEY", value: "abc" },
    ]);
  });

  it("unwraps quoted values and keeps what is inside them", () => {
    expect(
      parseEnvLines(`A="hello # world"\nB='it''s'\nC="line\\nnext"`)
    ).toEqual([
      { name: "A", value: "hello # world" },
      { name: "B", value: "it''s" },
      { name: "C", value: "line\nnext" },
    ]);
  });

  it("strips an inline comment after an unquoted value", () => {
    expect(parseEnvLines("A=value # note")).toEqual([
      { name: "A", value: "value" },
    ]);
  });

  it("reads CRLF line endings", () => {
    expect(parseEnvLines("A=1\r\nB=2\r\n")).toEqual([
      { name: "A", value: "1" },
      { name: "B", value: "2" },
    ]);
  });

  it("keeps every = after the first in the value", () => {
    expect(parseEnvLines("URL=https://x/v1?a=1&b=2")).toEqual([
      { name: "URL", value: "https://x/v1?a=1&b=2" },
    ]);
  });

  it("skips lines without a name and value separator", () => {
    expect(parseEnvLines("just words\n=nothing\nA=1")).toEqual([
      { name: "A", value: "1" },
    ]);
  });

  it("reads nothing from an empty paste", () => {
    expect(parseEnvLines("")).toEqual([]);
  });

  it("treats multi line text or text with = as an env paste", () => {
    expect(looksLikeEnv("A=1")).toBe(true);
    expect(looksLikeEnv("one\ntwo")).toBe(true);
    expect(looksLikeEnv("ANTHROPIC")).toBe(false);
  });
});

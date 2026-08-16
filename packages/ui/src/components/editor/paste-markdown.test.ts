import { describe, expect, test } from "bun:test";
import { looksLikeMarkdown } from "./paste-markdown";

/**
 * Pasting is the fast path into a prompt, so markdown has to arrive as
 * structure. The risk runs the other way too: prose that merely contains a
 * hyphen or an asterisk must paste as itself rather than being reinterpreted.
 */
describe("looksLikeMarkdown", () => {
  test("recognises block structure", () => {
    expect(looksLikeMarkdown("# Title")).toBe(true);
    expect(looksLikeMarkdown("### Deeper")).toBe(true);
    expect(looksLikeMarkdown("- one\n- two")).toBe(true);
    expect(looksLikeMarkdown("1. first\n2. second")).toBe(true);
    expect(looksLikeMarkdown("> quoted")).toBe(true);
    expect(looksLikeMarkdown("---")).toBe(true);
  });

  test("recognises inline structure", () => {
    expect(looksLikeMarkdown("some **bold** text")).toBe(true);
    expect(looksLikeMarkdown("a [link](https://example.com) here")).toBe(true);
  });

  test("finds markdown below the first line", () => {
    expect(looksLikeMarkdown("Intro paragraph.\n\n## Section\n\nBody.")).toBe(
      true
    );
  });

  test("leaves plain prose alone", () => {
    expect(looksLikeMarkdown("Answer the customer politely.")).toBe(false);
    expect(looksLikeMarkdown("Rewrite this - but keep the tone.")).toBe(false);
    expect(looksLikeMarkdown("Use 5 * 3 as the example.")).toBe(false);
    expect(looksLikeMarkdown("")).toBe(false);
  });

  test("leaves prompt variables alone", () => {
    expect(looksLikeMarkdown("Greet {{customer_name}} warmly.")).toBe(false);
  });
});

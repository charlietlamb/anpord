import { describe, expect, it } from "bun:test";
import { renderPrompt } from "../../src/domain/prompt";

describe("renderPrompt", () => {
  it("resolves a placeholder from the case", () => {
    expect(renderPrompt("fix: {{goal}}", { goal: "the parser" })).toBe(
      "fix: the parser"
    );
  });

  it("resolves the same placeholder more than once", () => {
    expect(renderPrompt("{{goal}} then {{goal}}", { goal: "x" })).toBe(
      "x then x"
    );
  });

  it("tolerates whitespace inside the braces", () => {
    expect(renderPrompt("{{ goal }}", { goal: "x" })).toBe("x");
  });

  /* A prompt asking for something nothing supplies is a mistake worth seeing.
     Blanking it would silently change what the agent was asked. */
  it("leaves an unknown placeholder in place", () => {
    expect(renderPrompt("{{goal}} and {{missing}}", { goal: "x" })).toBe(
      "x and {{missing}}"
    );
  });

  it("leaves a prompt with no placeholders alone", () => {
    expect(renderPrompt("just do it", { goal: "x" })).toBe("just do it");
  });
});

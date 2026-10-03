import { describe, expect, it } from "bun:test";
import { usedBy } from "../../../src/lib/settings/variable-uses";

describe("used by", () => {
  it("lists the harness and the judges a known key runs", () => {
    expect(usedBy("ANTHROPIC_API_KEY")).toEqual([
      { id: "claude", kind: "harness", label: "Claude Code" },
      { id: "anthropic", kind: "judge", label: "Judges" },
    ]);
  });

  it("shows a sandbox once even when the key names it twice", () => {
    expect(usedBy("MODAL_TOKEN_ID")).toEqual([
      { id: "modal", kind: "sandbox", label: "Modal" },
    ]);
  });

  it("shows one judges badge for a judge only key", () => {
    expect(usedBy("XAI_API_KEY")).toEqual([
      { id: "xai", kind: "judge", label: "Judges" },
    ]);
  });

  it("says your code for a name it does not know", () => {
    expect(usedBy("SEARCH_API_KEY")).toEqual([
      { kind: "code", label: "Your code" },
    ]);
  });
});

import { describe, expect, it } from "bun:test";
import { formatHarness, parseHarness } from "../../src/domain/harness-spec";

describe("a harness spec", () => {
  it("reads a name and a version", () => {
    expect(parseHarness("codex@0.144.4")).toEqual({
      name: "codex",
      version: "0.144.4",
    });
  });

  it("round trips", () => {
    const spec = parseHarness("claude-code@1.0.0");

    expect(spec).not.toBeNull();

    if (spec === null) {
      return;
    }

    expect(formatHarness(spec)).toBe("claude-code@1.0.0");
  });

  /** A version that is not a number is still a version: a branch, a digest
   * or a tag all pin an install, and refusing them would only push people
   * back to leaving it unpinned. */
  it("takes any version a registry would accept", () => {
    expect(parseHarness("codex@next")?.version).toBe("next");
    expect(parseHarness("codex@sha256:abc")?.version).toBe("sha256:abc");
  });

  /** The whole point of the field. An unpinned install compares two
   * different harnesses a month apart and nothing in the data shows it. */
  it("refuses a name with no version", () => {
    expect(parseHarness("codex")).toBeNull();
    expect(parseHarness("codex@")).toBeNull();
  });

  it("refuses a harness that does not exist", () => {
    expect(parseHarness("gpt-engineer@1.0.0")).toBeNull();
    expect(parseHarness("@1.0.0")).toBeNull();
  });

  it("refuses an empty spec", () => {
    expect(parseHarness("")).toBeNull();
    expect(parseHarness("@")).toBeNull();
  });
});

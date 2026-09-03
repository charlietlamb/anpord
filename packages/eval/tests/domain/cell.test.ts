import { describe, expect, it } from "bun:test";
import { createHash } from "node:crypto";
import { type CellParts, cellKeyOf } from "../../src/domain/cell";

const parts: CellParts = {
  harness: "codex",
  model: "gpt-5.2",
  provider: "daytona",
  taskId: "fix-parser",
  taskVersion: "abc123",
};

describe("cellKeyOf", () => {
  it("is stable for the same parts", () => {
    expect(cellKeyOf(parts)).toBe(cellKeyOf({ ...parts }));
  });

  /* The recipe is what migration 0033 recomputes in SQL, so it is pinned here:
     sha256 over the parts joined by newline, first 32 hex characters. A change
     to either side without the other silently splits every history. */
  it("is the recipe the migration recomputes", () => {
    const expected = createHash("sha256")
      .update("fix-parser\nabc123\ncodex\ngpt-5.2\ndaytona")
      .digest("hex")
      .slice(0, 32);

    expect<string>(cellKeyOf(parts)).toBe(expected);
  });

  it("changes when the provider changes", () => {
    expect(cellKeyOf({ ...parts, provider: "e2b" })).not.toBe(cellKeyOf(parts));
  });

  it("changes when the task changes", () => {
    expect(cellKeyOf({ ...parts, taskVersion: "def456" })).not.toBe(
      cellKeyOf(parts)
    );
  });
});

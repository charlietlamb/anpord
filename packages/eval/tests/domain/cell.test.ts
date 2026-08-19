import { describe, expect, it } from "bun:test";
import { type CellParts, cellKeyOf } from "../../src/domain/cell";

const parts: CellParts = {
  harness: "codex",
  harnessVersion: "0.144.4",
  model: "gpt-5.2",
  provider: "daytona",
  taskId: "fix-parser",
  taskVersion: "abc123",
};

describe("cellKeyOf", () => {
  it("is stable for the same parts", () => {
    expect(cellKeyOf(parts)).toBe(cellKeyOf({ ...parts }));
  });

  /* The reason harness version is in the key at all: a harness upgrade has to
     produce a different cell, or a comparison silently keeps reporting last
     month's answer as though it still held. */
  it("changes when the harness version changes", () => {
    expect(cellKeyOf({ ...parts, harnessVersion: "0.145.0" })).not.toBe(
      cellKeyOf(parts)
    );
  });

  it("changes when the provider changes", () => {
    expect(cellKeyOf({ ...parts, provider: "e2b" })).not.toBe(cellKeyOf(parts));
  });
});

import { describe, expect, it } from "bun:test";
import { createHash } from "node:crypto";
import { type CellParts, cellKeyOf } from "../../src/domain/cell";

const parts: CellParts = {
  caseInternalId: "ecas_9EKR3ZHZF24TFM16N0WJ72H",
  harness: "codex",
  model: "gpt-5.2",
  profile: null,
  provider: "daytona",
  userModel: null,
};

const digest = (parts: string) =>
  createHash("sha256").update(parts).digest("hex").slice(0, 32);

describe("cellKeyOf", () => {
  it("is stable for the same parts", () => {
    expect(cellKeyOf(parts)).toBe(cellKeyOf({ ...parts }));
  });

  it("is the recipe the migration recomputes", () => {
    expect<string>(cellKeyOf(parts)).toBe(
      digest("ecas_9EKR3ZHZF24TFM16N0WJ72H\ncodex\ngpt-5.2\ndaytona")
    );
  });

  it("changes when the provider changes", () => {
    expect(cellKeyOf({ ...parts, provider: "e2b" })).not.toBe(cellKeyOf(parts));
  });

  it("changes when the case changes", () => {
    expect(cellKeyOf({ ...parts, caseInternalId: "ecas_other" })).not.toBe(
      cellKeyOf(parts)
    );
  });

  it("holds across an edit to the case definition", () => {
    expect(cellKeyOf({ ...parts })).toBe(cellKeyOf(parts));
  });

  it("appends the profile name, leaving keys without one untouched", () => {
    const expected = digest(
      "ecas_9EKR3ZHZF24TFM16N0WJ72H\ncodex\ngpt-5.2\ndaytona\nsample"
    );

    expect<string>(cellKeyOf({ ...parts, profile: "sample" })).toBe(expected);
    expect(cellKeyOf({ ...parts, profile: "sample" })).not.toBe(
      cellKeyOf(parts)
    );
  });

  it("appends the user model, leaving keys without one untouched", () => {
    const expected = digest(
      "ecas_9EKR3ZHZF24TFM16N0WJ72H\ncodex\ngpt-5.2\ndaytona\ngpt-5.4-mini"
    );

    expect<string>(cellKeyOf({ ...parts, userModel: "gpt-5.4-mini" })).toBe(
      expected
    );
    expect(cellKeyOf({ ...parts, userModel: "gpt-5.4-mini" })).not.toBe(
      cellKeyOf(parts)
    );
  });

  it("separates two user models on one case", () => {
    expect(cellKeyOf({ ...parts, userModel: "gpt-5.4-mini" })).not.toBe(
      cellKeyOf({ ...parts, userModel: "gpt-5.6-sol" })
    );
  });

  it("orders the profile before the user model", () => {
    const expected = digest(
      "ecas_9EKR3ZHZF24TFM16N0WJ72H\ncodex\ngpt-5.2\ndaytona\nsample\nmini"
    );

    expect<string>(
      cellKeyOf({ ...parts, profile: "sample", userModel: "mini" })
    ).toBe(expected);
  });

  it("separates two profiles on one base", () => {
    expect(cellKeyOf({ ...parts, profile: "sample" })).not.toBe(
      cellKeyOf({ ...parts, profile: "other" })
    );
  });
});

import { describe, expect, it } from "bun:test";
import {
  byPopularity,
  interleavedByVendor,
  matches,
  type RankedModel,
} from "./model-ranking";

const model = (
  id: string,
  vendor: string | null,
  releasedAt: string | null = null
): RankedModel => ({
  displayName: id,
  id,
  releasedAt,
  summary: null,
  vendor,
});

const idsOf = (models: readonly RankedModel[]) => models.map((one) => one.id);

describe("ordering models", () => {
  it("puts a ranked vendor before an unranked one", () => {
    const sorted = [model("a", "someone-else"), model("b", "anthropic")]
      .toSorted(byPopularity)
      .map((one) => one.vendor);

    expect(sorted).toEqual(["anthropic", "someone-else"]);
  });

  it("keeps the labs ahead of the hosts that resell them", () => {
    const sorted = [model("a", "openrouter"), model("b", "zai")]
      .toSorted(byPopularity)
      .map((one) => one.vendor);

    expect(sorted).toEqual(["zai", "openrouter"]);
  });

  it("offers the newer of one vendor's models first", () => {
    const sorted = [
      model("old", "anthropic", "2024-01-01"),
      model("new", "anthropic", "2025-01-01"),
    ].toSorted(byPopularity);

    expect(idsOf(sorted)).toEqual(["new", "old"]);
  });

  it("orders by id when neither model says when it shipped", () => {
    const sorted = [model("b", "openai"), model("a", "openai")].toSorted(
      byPopularity
    );

    expect(idsOf(sorted)).toEqual(["a", "b"]);
  });
});

describe("interleaving vendors", () => {
  it("takes one from each before a second from any", () => {
    const shown = interleavedByVendor([
      model("claude-1", "anthropic"),
      model("claude-2", "anthropic"),
      model("gpt-1", "openai"),
      model("glm-1", "zai"),
    ]);

    expect(idsOf(shown)).toEqual(["claude-1", "gpt-1", "glm-1", "claude-2"]);
  });

  it("holds unranked vendors back until the labs are exhausted", () => {
    const shown = interleavedByVendor([
      model("claude-1", "anthropic"),
      model("resold-1", "some-host"),
      model("claude-2", "anthropic"),
    ]);

    expect(idsOf(shown)).toEqual(["claude-1", "claude-2", "resold-1"]);
  });

  it("keeps every model it was given", () => {
    const all = [
      model("a", "anthropic"),
      model("b", "openai"),
      model("c", null),
      model("d", "anthropic"),
    ];

    expect(interleavedByVendor(all)).toHaveLength(all.length);
  });
});

describe("matching a search", () => {
  const sonnet = model("anthropic/claude-sonnet-5", "anthropic");

  it.each([
    ["the vendor", "anthropic"],
    ["part of the name", "sonnet"],
    ["a different case", "SONNET"],
    ["nothing at all", "  "],
  ])("matches on %s", (_label, query) => {
    expect(matches(sonnet, query)).toBe(true);
  });

  it("does not match something absent", () => {
    expect(matches(sonnet, "gemini")).toBe(false);
  });
});

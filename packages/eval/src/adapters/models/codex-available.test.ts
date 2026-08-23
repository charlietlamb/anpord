import { describe, expect, it } from "bun:test";
import { listedIn } from "./codex-available";

const model = (
  slug: string,
  priority: number,
  visibility: string | null = "list"
) => ({
  description: null,
  display_name: null,
  priority,
  slug,
  visibility,
});

describe("listedIn", () => {
  it("orders by priority", () => {
    expect(
      listedIn({
        models: [model("cheap", 26), model("frontier", 1), model("mid", 7)],
      }).map((each) => each.slug)
    ).toEqual(["frontier", "mid", "cheap"]);
  });

  it("leaves out models the picker hides", () => {
    expect(
      listedIn({
        models: [model("shown", 1), model("internal", 2, "hide")],
      }).map((each) => each.slug)
    ).toEqual(["shown"]);
  });

  it("says nothing when the cache is empty", () => {
    expect(listedIn({ models: [] })).toEqual([]);
  });
});

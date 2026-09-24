import { describe, expect, it } from "bun:test";
import { changesBetween } from "../../src/domain/definition-changes";

const base = {
  cache: null,
  prepare: null,
  prompt: "fix the failing test",
  source: { files: { "a.txt": "one" }, kind: "files" as const },
  user: null,
  validator: { name: "validate", source: "v1" },
  verify: null,
};

describe("what changed between two versions of a case", () => {
  it("names nothing when the definition is the same", () => {
    expect(changesBetween(base, { ...base })).toEqual([]);
  });

  it("names each part that moved, in a fixed order", () => {
    expect(
      changesBetween(base, {
        ...base,
        prompt: "fix it faster",
        source: { files: { "a.txt": "two" }, kind: "files" },
        validator: { name: "validate", source: "v2" },
      })
    ).toEqual(["prompt", "source", "validator"]);
  });

  it("names the simulated user, the setup, the verifier and the cache", () => {
    expect(
      changesBetween(base, {
        ...base,
        cache: { key: "deps", path: "node_modules" },
        prepare: { name: "prepare", source: "install()" },
        user: { goal: "go live", kind: "simulated", prompt: "p" },
        verify: "npm test",
      })
    ).toEqual(["setup", "verifier", "simulated user", "cache"]);
  });

  it("ignores a setup whose name changed but whose source did not", () => {
    expect(
      changesBetween(
        { ...base, prepare: { name: "one", source: "install()" } },
        { ...base, prepare: { name: "two", source: "install()" } }
      )
    ).toEqual([]);
  });
});

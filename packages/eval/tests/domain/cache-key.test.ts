import { describe, expect, test } from "bun:test";
import { cacheKeyOf } from "../../src/domain/cache-key";

const prepare = (source: string) => ({ name: "prepareRepoImage", source });

describe("naming the cache a prepare shares", () => {
  test("the same prepare names the same cache", () => {
    expect(cacheKeyOf(prepare("npm ci"))).toBe(cacheKeyOf(prepare("npm ci")));
  });

  test("a changed prepare names a different one, so a stale cache is not reused", () => {
    expect(cacheKeyOf(prepare("npm ci"))).not.toBe(
      cacheKeyOf(prepare("npm ci --workspace renderer"))
    );
  });

  test("the name does not depend on what the function was called", () => {
    expect(cacheKeyOf({ name: "one", source: "npm ci" })).toBe(
      cacheKeyOf({ name: "another", source: "npm ci" })
    );
  });

  test("a case with no prepare asks for no cache", () => {
    expect(cacheKeyOf(null)).toBeUndefined();
  });
});

import { describe, expect, test } from "bun:test";
import { cacheKeyOf } from "../../src/domain/cache-key";

const ORG = "org_1";
const prepare = (source: string) => ({ name: "prepareRepoImage", source });

describe("naming the cache a prepare shares", () => {
  test("the same prepare names the same cache", () => {
    expect(cacheKeyOf(ORG, prepare("npm ci"))).toBe(
      cacheKeyOf(ORG, prepare("npm ci"))
    );
  });

  test("a changed prepare names a different one, so a stale cache is not reused", () => {
    expect(cacheKeyOf(ORG, prepare("npm ci"))).not.toBe(
      cacheKeyOf(ORG, prepare("npm ci --workspace renderer"))
    );
  });

  test("the name does not depend on what the function was called", () => {
    expect(cacheKeyOf(ORG, { name: "one", source: "npm ci" })).toBe(
      cacheKeyOf(ORG, { name: "another", source: "npm ci" })
    );
  });

  /* An organization with no sandbox credential of its own runs in the
     platform's provider account, where a volume name is all that separates
     it from anybody else preparing the same way. */
  test("another organization with the same prepare names a different cache", () => {
    expect(cacheKeyOf("org_1", prepare("npm ci"))).not.toBe(
      cacheKeyOf("org_2", prepare("npm ci"))
    );
  });

  test("the organization and the source cannot be run together into one name", () => {
    expect(cacheKeyOf("ab", prepare("c"))).not.toBe(
      cacheKeyOf("a", prepare("bc"))
    );
  });

  test("a case with no prepare asks for no cache", () => {
    expect(cacheKeyOf(ORG, null)).toBeUndefined();
  });
});

describe("what the cache key ignores", () => {
  /* The bundler writes the path of every file it read into its output. Left
     in the key, a cache filled on one machine is a cache no other machine can
     find -- and a checkout lives at a different path on each of them. */
  test("the path a prepare happened to be compiled from", () => {
    const compiled = (from: string) =>
      prepare(`// ${from}/eval.ts\nexport const install = () => ({});`);

    expect(cacheKeyOf(ORG, compiled("/tmp/build-a"))).toBe(
      cacheKeyOf(ORG, compiled("/home/runner/work"))
    );
  });

  test("but not a change to what the prepare actually does", () => {
    expect(
      cacheKeyOf(ORG, prepare("// x\nexport const install = () => ({ a: 1 });"))
    ).not.toBe(
      cacheKeyOf(ORG, prepare("// x\nexport const install = () => ({ a: 2 });"))
    );
  });
});

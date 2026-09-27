import { describe, expect, test } from "bun:test";
import { generateId } from "../src/generate";
import { ID_PREFIXES, type IdEntity } from "../src/prefixes";

const CROCKFORD = /^[0-9A-HJKMNP-TV-Z]+$/;
const AMBIGUOUS = /[ILOU]/;

describe("id generation", () => {
  test("every entity gets its own prefix", async () => {
    for (const [entity, prefix] of Object.entries(ID_PREFIXES)) {
      const id = await generateId(entity as IdEntity);
      expect(id).toStartWith(`${prefix}_`);
    }
  });

  test("a credential connection id starts with con_", async () => {
    expect((await generateId("credentialConnection")).slice(0, 4)).toBe("con_");
  });

  test("prefixes are unique across entities", () => {
    const prefixes = Object.values(ID_PREFIXES);
    expect(new Set(prefixes).size).toBe(prefixes.length);
  });

  test("the suffix avoids ambiguous characters", async () => {
    const suffix = (await generateId("prompt")).split("_")[1];
    expect(suffix).toMatch(CROCKFORD);
    expect(suffix).not.toMatch(AMBIGUOUS);
  });

  test("ids do not collide", async () => {
    const ids = new Set(
      await Promise.all(
        Array.from({ length: 500 }, () => generateId("promptVersion"))
      )
    );
    expect(ids.size).toBe(500);
  });
});

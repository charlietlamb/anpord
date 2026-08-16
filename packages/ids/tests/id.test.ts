import { describe, expect, test } from "bun:test";
import { Effect } from "effect";
import { IdGenerator } from "../src/id";
import { IdGeneratorLive } from "../src/layer";
import { ID_PREFIXES } from "../src/prefixes";

const CROCKFORD = /^[0-9A-HJKMNP-TV-Z]+$/;
const AMBIGUOUS = /[ILOU]/;

const generate = (entity: keyof typeof ID_PREFIXES) =>
  Effect.runSync(
    Effect.flatMap(IdGenerator, (ids) => ids.generate(entity)).pipe(
      Effect.provide(IdGeneratorLive)
    )
  );

describe("id generation", () => {
  test("every entity gets its own prefix", () => {
    for (const [entity, prefix] of Object.entries(ID_PREFIXES)) {
      const id = generate(entity as keyof typeof ID_PREFIXES);
      expect(id).toStartWith(`${prefix}_`);
    }
  });

  test("prefixes are unique across entities", () => {
    const prefixes = Object.values(ID_PREFIXES);
    expect(new Set(prefixes).size).toBe(prefixes.length);
  });

  test("the suffix avoids ambiguous characters", () => {
    const suffix = generate("prompt").split("_")[1];
    expect(suffix).toMatch(CROCKFORD);
    expect(suffix).not.toMatch(AMBIGUOUS);
  });

  test("ids do not collide", () => {
    const ids = new Set(
      Array.from({ length: 500 }, () => generate("promptVersion"))
    );
    expect(ids.size).toBe(500);
  });
});

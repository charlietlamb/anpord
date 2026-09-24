import { describe, expect, test } from "bun:test";
import { suiteIdOf } from "../../src/evals/suite-id";

describe("a suite id derived from its name", () => {
  test.each([
    ["smoke", "smoke"],
    ["Checkout Flow", "checkout-flow"],
    ["  API -- v2 (beta)!  ", "api-v2-beta"],
    ["Café résumé", "cafe-resume"],
  ])("%s becomes %s", (name, id) => {
    expect(suiteIdOf(name)).toBe(id);
  });

  test("stays within the handle limit without a trailing hyphen", () => {
    const id = suiteIdOf(`${"a".repeat(99)} b`);

    expect(id.length).toBeLessThanOrEqual(100);
    expect(id.endsWith("-")).toBe(false);
  });
});

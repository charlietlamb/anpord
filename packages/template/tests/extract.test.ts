import { describe, expect, test } from "bun:test";
import { extractVariables } from "../src/extract";

/** Ported from the editor's own helper so the move out of the UI package is
 * provably behaviour preserving. */
describe("extractVariables", () => {
  test("lists each name once, in the order it appears", () => {
    expect(extractVariables("{{b}} {{a}} {{b}}")).toEqual(["b", "a"]);
  });

  test("reads a name written with spaces", () => {
    expect(extractVariables("{{ name }}")).toEqual(["name"]);
  });

  test("finds nothing in prose", () => {
    expect(extractVariables("You are a helpful assistant.")).toEqual([]);
  });

  test("accepts dots and hyphens as part of a name", () => {
    expect(extractVariables("{{user.name}} {{order-id}}")).toEqual([
      "user.name",
      "order-id",
    ]);
  });

  /** The editor draws a chip for whatever this reports, so reporting an
   * escaped brace would promise a fill that never comes. */
  test("does not report an escaped brace as a variable", () => {
    expect(extractVariables("{{{{raw}}}}")).toEqual([]);
  });
});

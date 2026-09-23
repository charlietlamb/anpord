import { describe, expect, test } from "bun:test";
import { isDefinition } from "../../src/evals/definition-loader";

const definition = {
  cases: [],
  name: "release notes",
  prompt: "Do the work.",
  variants: [],
  trials: 3,
};

describe("isDefinition", () => {
  test("accepts what the suite builder returns", () => {
    expect(isDefinition(definition)).toBe(true);
  });

  /** The author's own functions live in the cases and variants, so the guard
   * checks that a definition was exported at all and leaves what is in it to
   * the compiler, which can name what is wrong. */
  test("accepts a definition carrying its author's functions", () => {
    expect(
      isDefinition({
        ...definition,
        cases: [{ id: "a", name: "a", validate: () => ({ passed: true }) }],
        variants: [{ harness: "claude" }],
      })
    ).toBe(true);
  });

  test("refuses a module that exported something else", () => {
    for (const value of [null, undefined, "a string", 7, []]) {
      expect(isDefinition(value)).toBe(false);
    }
  });

  test("refuses a definition missing a required field", () => {
    const { cases, name, prompt, variants, trials } = definition;

    expect(isDefinition({ name, prompt, variants, trials })).toBe(false);
    expect(isDefinition({ cases, prompt, variants, trials })).toBe(false);
    expect(isDefinition({ cases, name, variants, trials })).toBe(false);
    expect(isDefinition({ cases, name, prompt, trials })).toBe(false);
    expect(isDefinition({ cases, name, prompt, variants })).toBe(false);
  });

  /** Trials is a count of runs, and a fraction of a run is not one. */
  test("refuses a fractional trial count", () => {
    expect(isDefinition({ ...definition, trials: 2.5 })).toBe(false);
  });

  test("refuses a field of the wrong type", () => {
    expect(isDefinition({ ...definition, name: 7 })).toBe(false);
    expect(isDefinition({ ...definition, cases: "none" })).toBe(false);
  });
});

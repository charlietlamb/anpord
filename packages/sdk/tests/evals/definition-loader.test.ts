import { describe, expect, test } from "bun:test";
import { isDefinition } from "../../src/evals/definition-loader";

const definition = {
  cases: [],
  name: "release notes",
  prompt: "Do the work.",
  tasks: [],
  trials: 3,
};

describe("isDefinition", () => {
  test("accepts what defineEval returns", () => {
    expect(isDefinition(definition)).toBe(true);
  });

  /** The author's own functions live in the cases and tasks, so the guard
   * checks that a definition was exported at all and leaves what is in it to
   * the compiler, which can name what is wrong. */
  test("accepts a definition carrying its author's functions", () => {
    expect(
      isDefinition({
        ...definition,
        cases: [{ name: "a", validate: () => ({ passed: true }) }],
        tasks: [{ harness: "claude" }],
      })
    ).toBe(true);
  });

  test("refuses a module that exported something else", () => {
    for (const value of [null, undefined, "a string", 7, []]) {
      expect(isDefinition(value)).toBe(false);
    }
  });

  test("refuses a definition missing a required field", () => {
    const { cases, name, prompt, tasks, trials } = definition;

    expect(isDefinition({ name, prompt, tasks, trials })).toBe(false);
    expect(isDefinition({ cases, prompt, tasks, trials })).toBe(false);
    expect(isDefinition({ cases, name, tasks, trials })).toBe(false);
    expect(isDefinition({ cases, name, prompt, trials })).toBe(false);
    expect(isDefinition({ cases, name, prompt, tasks })).toBe(false);
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

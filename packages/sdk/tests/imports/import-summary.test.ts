import { describe, expect, test } from "bun:test";
import { summaryOf } from "../../src/cli/eval-import";

describe("what the import reports", () => {
  test("counts the cases and the assertions it converted", () => {
    expect(summaryOf({ cases: 4, converted: 9, needsAuthor: 0 })).toBe(
      "Read 4 cases, converted 9 assertions."
    );
  });

  /** The unconverted count is the headline, not a footnote: a suite reporting
   * a pass for a check nobody wrote is worse than no suite. */
  test("says plainly how many need a human", () => {
    const summary = summaryOf({ cases: 4, converted: 9, needsAuthor: 3 });

    expect(summary).toContain("3 assertions could not be converted");
    expect(summary).toContain("need a human");
    expect(summary).toContain("fails until you write the check");
  });

  test("counts one of anything as one", () => {
    expect(summaryOf({ cases: 1, converted: 1, needsAuthor: 1 })).toContain(
      "Read 1 case, converted 1 assertion. 1 assertion could not be converted and needs a human"
    );
  });
});

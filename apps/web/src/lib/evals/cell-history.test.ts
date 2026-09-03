import { describe, expect, it } from "bun:test";
import { DateTime } from "effect";
import { readingsOf, summaryOf } from "./cell-history";

const AT = Date.UTC(2026, 7, 22, 9, 14);

const reading = (
  ordinal: number,
  passed: number,
  scored: number,
  finished = true,
  harnessVersion = "0.144.4",
  profileVersion: string | null = null
) => ({
  distribution: {
    commandMax: 2,
    commandMedian: 2,
    commandMin: 2,
    deterministic: true,
    failed: scored - passed,
    passRate: scored === 0 ? 0 : passed / scored,
    passed,
    scored,
    trials: scored,
    voided: 0,
  },
  finishedAt: finished ? DateTime.unsafeMake(AT + ordinal * 3_600_000) : null,
  harnessVersion,
  internalId: `cell_${ordinal}`,
  profileVersion,
  runId: `run_${ordinal}`,
  trials: [],
});

const newestFirst = <A>(entries: readonly A[]) => [...entries].reverse();

describe("readingsOf", () => {
  it("names the harness version only where it changed", () => {
    const marks = readingsOf(
      newestFirst([
        reading(1, 1, 1),
        reading(2, 1, 1),
        reading(3, 0, 1, true, "0.145.0"),
        reading(4, 0, 1, true, "0.145.0"),
      ])
    );

    expect(marks.map((mark) => mark.title.endsWith("0.145.0"))).toEqual([
      false,
      false,
      true,
      false,
    ]);
  });

  /** An edited profile is a new version on the same cell, so it moves a
   * reading the way a harness release does and is marked the same way. */
  it("names a profile version only where it changed, shortened", () => {
    const long = "a1b2c3d4e5f60718293a4b5c6d7e8f90";
    const edited = "0f9e8d7c6b5a49382716f5e4d3c2b1a0";

    const marks = readingsOf(
      newestFirst([
        reading(1, 1, 1, true, "1.18.21", long),
        reading(2, 1, 1, true, "1.18.21", long),
        reading(3, 0, 1, true, "1.18.21", edited),
      ])
    );

    expect(marks.map((mark) => mark.title.endsWith("· 0f9e8d7c"))).toEqual([
      false,
      false,
      true,
    ]);
  });

  it("names both versions where a release and an edit landed together", () => {
    const marks = readingsOf(
      newestFirst([
        reading(1, 1, 1, true, "1.18.21", "a1b2c3d4e5f60718293a4b5c6d7e8f90"),
        reading(2, 1, 1, true, "1.19.0", "0f9e8d7c6b5a49382716f5e4d3c2b1a0"),
      ])
    );

    expect(marks[1].title).toContain("· 1.19.0 · 0f9e8d7c");
  });

  it("puts the oldest reading first, so left to right is time", () => {
    const marks = readingsOf(
      newestFirst([reading(1, 1, 1), reading(2, 0, 1), reading(3, 1, 1)])
    );

    expect(marks.map((mark) => mark.entry.runId)).toEqual([
      "run_1",
      "run_2",
      "run_3",
    ]);
  });

  it("colours a reading by what it found", () => {
    const marks = readingsOf(
      newestFirst([
        reading(1, 1, 1),
        reading(2, 0, 1),
        reading(3, 0, 0),
        reading(4, 0, 0, false),
      ])
    );

    expect(marks.map((mark) => mark.tone)).toEqual([
      "positive",
      "critical",
      "pending",
      "running",
    ]);
  });
});

describe("summaryOf", () => {
  it("reports steadiness rather than repeating a date", () => {
    const marks = readingsOf(
      newestFirst(Array.from({ length: 8 }, (_, index) => reading(index, 1, 1)))
    );

    expect(summaryOf(marks)).toContain("Steady across 8 readings");
  });

  it("dates the change rather than the readings", () => {
    const marks = readingsOf(
      newestFirst([
        reading(1, 1, 1),
        reading(2, 1, 1),
        reading(3, 0, 1),
        reading(4, 0, 1),
      ])
    );

    const summary = summaryOf(marks);

    expect(summary).toContain("Changed");
    expect(summary).toContain("steady for 2 since");
  });

  it("counts a running reading apart from the settled ones", () => {
    const marks = readingsOf(
      newestFirst([reading(1, 1, 1), reading(2, 1, 1), reading(3, 0, 0, false)])
    );

    const summary = summaryOf(marks);

    expect(summary).toContain("Steady across 2 readings");
    expect(summary).toContain("1 running");
  });

  it("says so when nothing has settled yet", () => {
    expect(summaryOf(readingsOf([reading(1, 0, 0, false)]))).toBe(
      "One reading running."
    );
  });
});

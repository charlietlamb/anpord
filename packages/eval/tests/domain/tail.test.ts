import { describe, expect, it } from "bun:test";
import { advance, markFor } from "../../src/domain/tail";

const mark = (run: string, ordinal: number, seq: number) => ({
  run,
  ordinal,
  seq,
});

describe("a tail's marks", () => {
  it("reads a trial it has not seen from the start", () => {
    expect(markFor([], { run: "c", ordinal: 1 })).toBe(-1);
  });

  it("moves each trial to the furthest event read from it", () => {
    const next = advance(
      [mark("a", 1, 4)],
      [mark("a", 1, 5), mark("a", 1, 6), mark("b", 1, 0)]
    );

    expect(markFor(next, { run: "a", ordinal: 1 })).toBe(6);
    expect(markFor(next, { run: "b", ordinal: 1 })).toBe(0);
  });

  it("keeps two trials of one run apart", () => {
    const next = advance([], [mark("a", 1, 9), mark("a", 2, 2)]);

    expect(markFor(next, { run: "a", ordinal: 1 })).toBe(9);
    expect(markFor(next, { run: "a", ordinal: 2 })).toBe(2);
  });

  it("never moves backwards, so a repeated read changes nothing", () => {
    const held = [mark("a", 1, 9)];

    expect(advance(held, [mark("a", 1, 3)])).toEqual(held);
  });
});

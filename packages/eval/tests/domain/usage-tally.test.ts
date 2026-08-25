import { describe, expect, it } from "bun:test";
import { Option } from "effect";
import type { HarnessUsage } from "../../src/domain/harness-event";
import {
  EMPTY_TALLY,
  NO_USAGE,
  tallied,
  totalOf,
} from "../../src/domain/usage-tally";

const usage = (input: number, output: number, cacheRead = 0): HarnessUsage => ({
  cacheReadTokens: cacheRead,
  cacheWriteTokens: 0,
  inputTokens: input,
  outputTokens: output,
  totalTokens: input + output + cacheRead,
});

describe("usage tally", () => {
  it("adds each turn to the total and keeps it as its own share", () => {
    const tally = [usage(10, 5), usage(20, 7)].reduce(
      (found, turn) => tallied(found, turn, false),
      EMPTY_TALLY
    );

    expect(tally.total.inputTokens).toBe(30);
    expect(tally.total.outputTokens).toBe(12);
    expect(tally.turns).toHaveLength(2);
  });

  it("carries the cache counts through the sum", () => {
    const tally = [usage(1, 2, 100), usage(3, 4, 900)].reduce(
      (found, turn) => tallied(found, turn, false),
      EMPTY_TALLY
    );

    expect(tally.total.cacheReadTokens).toBe(1000);
  });

  /* The hazard this module exists for: Claude reports every turn and then
     reports the whole run, and adding the second to the first counts every
     token twice. */
  it("replaces rather than adds when a report is cumulative", () => {
    const turns = [usage(10, 5), usage(20, 7)].reduce(
      (found, turn) => tallied(found, turn, false),
      EMPTY_TALLY
    );

    const withClosing = tallied(turns, usage(30, 12), true);

    expect(withClosing.total.inputTokens).toBe(30);
    expect(withClosing.total.outputTokens).toBe(12);
  });

  it("keeps the turns a cumulative report summarises", () => {
    const turns = tallied(EMPTY_TALLY, usage(10, 5), false);
    const withClosing = tallied(turns, usage(10, 5), true);

    expect(withClosing.turns).toHaveLength(1);
  });

  it("reports nothing when a harness reported nothing", () => {
    expect(totalOf(EMPTY_TALLY)).toStrictEqual(Option.none());
  });

  /* A harness that ran and reported zero is not a harness that stayed
     silent, and only the second should read as unknown. */
  it("reports a counted zero rather than nothing", () => {
    const counted = tallied(EMPTY_TALLY, NO_USAGE, false);

    expect(Option.isSome(totalOf(counted))).toBe(true);
  });
});

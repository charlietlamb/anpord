import { describe, expect, it } from "bun:test";
import { formatDuration } from "../../src/cli/duration";

describe("how a duration reads", () => {
  it.each([
    [420, "420ms"],
    [999.6, "1.0s"],
    [2140, "2.1s"],
    [59_960, "1m00s"],
    [119_600, "2m00s"],
    [300_000, "5m00s"],
  ])("writes %i ms as %s", (ms, shown) => {
    expect(formatDuration(ms)).toBe(shown);
  });
});

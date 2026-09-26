import { describe, expect, it } from "bun:test";
import { autoStopMinutesFor } from "../../src/domain/sandbox-lifetime";

describe("how long a trial's sandbox may live", () => {
  it("keeps the usual fifteen minutes for the default or a shorter limit", () => {
    expect([null, 60_000, 900_000].map(autoStopMinutesFor)).toEqual([
      15, 15, 15,
    ]);
  });

  it("stays open as much longer as the case gives the agent", () => {
    expect([2_400_000, 3_600_000].map(autoStopMinutesFor)).toEqual([40, 60]);
  });
});

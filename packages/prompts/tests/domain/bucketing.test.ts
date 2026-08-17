import { describe, expect, it } from "bun:test";
import { bucketOf, withinGate } from "../../src/domain/bucketing";

const units = (count: number) =>
  Array.from({ length: count }, (_, index) => `unit_${index}`);

const shareWithin = (
  salt: string,
  percent: number,
  sample: readonly string[]
) =>
  sample.filter((unit) => withinGate(salt, unit, percent)).length /
  sample.length;

describe("bucketOf", () => {
  it("answers the same bucket for the same salt and unit", () => {
    expect(bucketOf("s", "user_1")).toBe(bucketOf("s", "user_1"));
  });

  it("answers a different bucket under a different salt", () => {
    expect(bucketOf("a", "user_1")).not.toBe(bucketOf("b", "user_1"));
  });

  it("stays inside ten thousand buckets", () => {
    for (const unit of units(1000)) {
      const bucket = bucketOf("s", unit);
      expect(bucket).toBeGreaterThanOrEqual(0);
      expect(bucket).toBeLessThan(10_000);
    }
  });

  it("spreads sequential units evenly, which is the shape real keys take", () => {
    const share = shareWithin("s", 50, units(20_000));
    expect(Math.abs(share - 0.5)).toBeLessThan(0.02);
  });
});

describe("withinGate", () => {
  it("admits about the share it is asked for", () => {
    const sample = units(20_000);
    for (const percent of [5, 25, 60, 90]) {
      const share = shareWithin("s", percent, sample);
      expect(Math.abs(share - percent / 100)).toBeLessThan(0.02);
    }
  });

  /** The property the whole design rests on: ramping may admit units but must
   * never move one already admitted, or a caller mid-conversation changes
   * version underneath themselves. */
  it("never removes a unit from the gate as the percent grows", () => {
    const sample = units(20_000);
    for (const unit of sample) {
      let admitted = false;
      for (const percent of [1, 5, 10, 25, 50, 75, 99]) {
        const inside = withinGate("s", unit, percent);
        if (admitted) {
          expect(inside).toBe(true);
        }
        admitted = admitted || inside;
      }
    }
  });

  it("admits nobody at nought and everybody at a hundred", () => {
    const sample = units(500);
    expect(shareWithin("s", 0, sample)).toBe(0);
    expect(shareWithin("s", 100, sample)).toBe(1);
  });

  /** Two rollouts running at once must not overlap more than chance. A single
   * FNV pass fails this; the double hash is what makes it hold. */
  it("keeps two rollouts independent of each other", () => {
    const sample = units(20_000);
    const both = sample.filter(
      (unit) => withinGate("a", unit, 50) && withinGate("b", unit, 50)
    ).length;
    expect(Math.abs(both / sample.length - 0.25)).toBeLessThan(0.02);
  });
});

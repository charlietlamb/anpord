import { describe, expect, test } from "bun:test";
import { compare, regressions } from "../src/report/compare";
import { flatten, metric } from "../src/report/metric";
import { median, percentile, summarise } from "../src/report/stats";
import { seeded } from "../src/seed/random";

describe("stats", () => {
  test("percentile uses nearest rank", () => {
    const values = [5, 1, 4, 2, 3, 10, 9, 8, 7, 6];
    expect(percentile(values, 50)).toBe(5);
    expect(percentile(values, 95)).toBe(10);
    expect(percentile(values, 10)).toBe(1);
  });

  test("median averages the middle pair of an even list", () => {
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([7, 1, 3])).toBe(3);
  });

  test("summarise keeps the median as the value and the rest as spread", () => {
    expect(summarise("ms", [12, 10, 11, 30])).toEqual({
      better: "lower",
      spread: { max: 30, min: 10, p95: 30, samples: 4 },
      unit: "ms",
      value: 11.5,
    });
  });
});

describe("compare", () => {
  test("a latency 10% slower regresses at a 5% threshold", () => {
    const [latency] = compare(
      [{ "x.p95_ms": metric("ms", 100) }],
      [{ "x.p95_ms": metric("ms", 110) }],
      5
    );
    expect(latency).toEqual({
      after: 110,
      before: 100,
      change: 0.1,
      key: "x.p95_ms",
      unit: "ms",
      verdict: "regressed",
    });
  });

  test("throughput falling is a regression, rising is an improvement", () => {
    const [fell] = compare(
      [{ rps: metric("rps", 200) }],
      [{ rps: metric("rps", 150) }],
      5
    );
    const [rose] = compare(
      [{ rps: metric("rps", 200) }],
      [{ rps: metric("rps", 250) }],
      5
    );
    expect(fell?.verdict).toBe("regressed");
    expect(rose?.verdict).toBe("improved");
  });

  test("a change inside the noise floor is the same even when the percentage is large", () => {
    const [tiny] = compare(
      [{ p50_ms: metric("ms", 0.4) }],
      [{ p50_ms: metric("ms", 0.9) }],
      5
    );
    expect(tiny?.verdict).toBe("same");
  });

  test("several runs per side are pooled by their median", () => {
    const before = [
      { q: metric("count", 4) },
      { q: metric("count", 4) },
      { q: metric("count", 40) },
    ];
    const after = [{ q: metric("count", 6) }, { q: metric("count", 6) }];
    const [pooled] = compare(before, after, 5);
    expect(pooled?.before).toBe(4);
    expect(pooled?.after).toBe(6);
    expect(pooled?.verdict).toBe("regressed");
  });

  test("metrics only one side has are added or removed, never regressions", () => {
    const result = compare(
      [{ gone: metric("ms", 5) }],
      [{ fresh: metric("ms", 5) }],
      5
    );
    expect(result.map((each) => [each.key, each.verdict])).toEqual([
      ["fresh", "added"],
      ["gone", "removed"],
    ]);
    expect(regressions(result)).toEqual([]);
  });
});

describe("flatten", () => {
  test("prefixes each metric with its suite", () => {
    expect(
      Object.keys(
        flatten({
          commit: "abc",
          host: "test",
          recordedAt: "2026-09-27T00:00:00.000Z",
          suites: [
            {
              metrics: { cold_start_ms: metric("ms", 900) },
              settings: {},
              suite: "server",
            },
            {
              metrics: { "evals.lcp_ms": metric("ms", 300) },
              settings: {},
              suite: "web",
            },
          ],
          version: 1,
        })
      )
    ).toEqual(["server.cold_start_ms", "web.evals.lcp_ms"]);
  });
});

describe("seeded", () => {
  test("the same seed draws the same sequence", () => {
    const draw = (seed: number) => {
      const random = seeded(seed);
      return [
        random.between(0, 99),
        random.between(0, 99),
        random.between(0, 99),
      ];
    };
    expect(draw(7)).toEqual([0, 68, 81]);
    expect(draw(7)).toEqual([0, 68, 81]);
    expect(draw(7)).not.toEqual(draw(8));
  });
});

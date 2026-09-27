import type { Metric, Metrics, Unit } from "./metric";
import { median } from "./stats";

type Verdict = "added" | "improved" | "regressed" | "removed" | "same";

export interface Comparison {
  readonly after: number | null;
  readonly before: number | null;
  readonly change: number | null;
  readonly key: string;
  readonly unit: Unit;
  readonly verdict: Verdict;
}

const NOISE_FLOOR: Readonly<Record<Unit, number>> = {
  bytes: 1024,
  count: 0.5,
  ms: 1,
  ratio: 0.001,
  rps: 1,
  score: 2,
};

const pooled = (runs: readonly Metrics[], key: string) => {
  const found = runs.flatMap((run) => {
    const value = run[key];
    return value === undefined ? [] : [value];
  });
  const [first] = found;
  return first === undefined
    ? undefined
    : { ...first, value: median(found.map((each) => each.value)) };
};

const verdictOf = (
  before: Metric,
  after: Metric,
  thresholdPercent: number
): Verdict => {
  const worse =
    before.better === "lower"
      ? after.value - before.value
      : before.value - after.value;
  const relative =
    before.value === 0 ? Math.sign(worse) : worse / Math.abs(before.value);

  if (Math.abs(worse) <= NOISE_FLOOR[before.unit]) {
    return "same";
  }
  if (relative * 100 > thresholdPercent) {
    return "regressed";
  }
  if (relative * 100 < -thresholdPercent) {
    return "improved";
  }
  return "same";
};

export const compare = (
  before: readonly Metrics[],
  after: readonly Metrics[],
  thresholdPercent: number
): readonly Comparison[] => {
  const keys = [
    ...new Set([...before, ...after].flatMap((run) => Object.keys(run))),
  ].sort();

  return keys.map((key): Comparison => {
    const was = pooled(before, key);
    const now = pooled(after, key);

    if (was === undefined || now === undefined) {
      const present = (was ?? now) as Metric;
      return {
        after: now?.value ?? null,
        before: was?.value ?? null,
        change: null,
        key,
        unit: present.unit,
        verdict: was === undefined ? "added" : "removed",
      };
    }

    return {
      after: now.value,
      before: was.value,
      change: was.value === 0 ? null : (now.value - was.value) / was.value,
      key,
      unit: was.unit,
      verdict: verdictOf(was, now, thresholdPercent),
    };
  });
};

export const regressions = (comparisons: readonly Comparison[]) =>
  comparisons.filter((each) => each.verdict === "regressed");

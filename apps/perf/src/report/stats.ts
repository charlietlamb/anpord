import { metric, type Unit } from "./metric";

const sorted = (values: readonly number[]) =>
  [...values].sort((left, right) => left - right);

export const percentile = (values: readonly number[], rank: number) => {
  if (values.length === 0) {
    return Number.NaN;
  }
  const ordered = sorted(values);
  const index = Math.min(
    ordered.length - 1,
    Math.max(0, Math.ceil((rank / 100) * ordered.length) - 1)
  );
  return ordered[index] ?? Number.NaN;
};

export const median = (values: readonly number[]) => {
  if (values.length === 0) {
    return Number.NaN;
  }
  const ordered = sorted(values);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 === 1
    ? (ordered[middle] ?? Number.NaN)
    : ((ordered[middle - 1] ?? 0) + (ordered[middle] ?? 0)) / 2;
};

const round = (value: number) => Math.round(value * 1000) / 1000;

export const summarise = (unit: Unit, values: readonly number[]) =>
  metric(unit, round(median(values)), {
    max: round(Math.max(...values)),
    min: round(Math.min(...values)),
    p95: round(percentile(values, 95)),
    samples: values.length,
  });

export const single = (unit: Unit, value: number) => metric(unit, round(value));

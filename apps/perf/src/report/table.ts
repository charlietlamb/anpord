import type { Comparison } from "./compare";
import type { Metric, Metrics, Unit } from "./metric";

const SUFFIX: Readonly<Record<Unit, string>> = {
  bytes: " B",
  count: "",
  ms: " ms",
  ratio: "",
  rps: " /s",
  score: "",
};

const number = (value: number) =>
  Number.isInteger(value)
    ? value.toLocaleString("en-US")
    : value.toLocaleString("en-US", { maximumFractionDigits: 2 });

const shown = (unit: Unit, value: number | null) =>
  value === null ? "" : `${number(value)}${SUFFIX[unit]}`;

const spreadOf = (value: Metric) =>
  value.spread === undefined
    ? ""
    : `p95 ${number(value.spread.p95)}  min ${number(value.spread.min)}  max ${number(value.spread.max)}  n ${value.spread.samples}`;

const render = (rows: readonly (readonly string[])[]) => {
  const widths = (rows[0] ?? []).map((_, column) =>
    Math.max(...rows.map((row) => (row[column] ?? "").length))
  );
  return rows
    .map((row) =>
      row
        .map((cell, column) =>
          column === 0
            ? cell.padEnd(widths[column] ?? 0)
            : cell.padStart(widths[column] ?? 0)
        )
        .join("  ")
        .trimEnd()
    )
    .join("\n");
};

export const metricsTable = (metrics: Metrics) =>
  render([
    ["metric", "median", "spread"],
    ...Object.entries(metrics).map(([key, value]) => [
      key,
      shown(value.unit, value.value),
      spreadOf(value),
    ]),
  ]);

const percent = (change: number | null) =>
  change === null
    ? ""
    : `${change > 0 ? "+" : ""}${(change * 100).toFixed(1)}%`;

export const comparisonTable = (comparisons: readonly Comparison[]) =>
  render([
    ["metric", "before", "after", "change", "verdict"],
    ...comparisons.map((each) => [
      each.key,
      shown(each.unit, each.before),
      shown(each.unit, each.after),
      percent(each.change),
      each.verdict,
    ]),
  ]);

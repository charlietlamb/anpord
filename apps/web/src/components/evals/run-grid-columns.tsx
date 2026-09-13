import {
  leadersOn,
  type Metric as MetricKey,
  type VariantResult,
} from "@anpord/schema/domain/variant-comparison";
import { Metric } from "@/components/evals/metric";
import { count, NOTHING, seconds } from "@/lib/evals/duration";
import type { MetricName } from "@/lib/evals/metrics";

interface Column {
  readonly hint: string;
  readonly metric: MetricKey;
  readonly name: MetricName;
  readonly read: (result: VariantResult) => string;
}

const passOf = (result: VariantResult) => {
  if (result.scored === 0) {
    return NOTHING;
  }

  if (result.cases === 1) {
    return `${result.passed}/${result.scored}`;
  }

  return `${Math.round((result.passRate ?? 0) * 100)}%`;
};

const COLUMNS: readonly Column[] = [
  {
    hint: "Trials that passed, across the cell",
    metric: "passRate",
    name: "pass",
    read: passOf,
  },
  {
    hint: "Median time the model spent thinking",
    metric: "modelMs",
    name: "model",
    read: (result) =>
      result.modelMs === null ? NOTHING : seconds(result.modelMs),
  },
  {
    hint: "Median commands the agent ran",
    metric: "commands",
    name: "commands",
    read: (result) =>
      result.commands === null ? NOTHING : String(Math.round(result.commands)),
  },
  {
    hint: "Median tokens the harness reported",
    metric: "tokens",
    name: "tokens",
    read: (result) =>
      result.tokens === null ? NOTHING : count(Math.round(result.tokens)),
  },
];

export const TRACKS =
  "grid-cols-[auto_minmax(0,1fr)_repeat(4,auto)_auto] gap-x-4 gap-y-0";

export const LINE = "col-span-full grid grid-cols-subgrid items-center";

export const leadersOf = (results: readonly VariantResult[]) =>
  new Map(
    COLUMNS.map((column) => [column.metric, leadersOn(results, column.metric)])
  );

export function Metrics({
  leaders,
  result,
}: {
  readonly leaders: ReadonlyMap<MetricKey, ReadonlySet<number>>;
  readonly result: VariantResult;
}) {
  return COLUMNS.map((column) => (
    <Metric
      className={
        leaders.get(column.metric)?.has(result.taskIndex)
          ? "font-medium text-foreground"
          : "text-muted-foreground"
      }
      hint={column.hint}
      key={column.metric}
      name={column.name}
    >
      {column.read(result)}
    </Metric>
  ));
}

import type { EvalCell, EvalRun } from "@anpord/schema/domain/evals";
import {
  type CaseResult,
  type CellResult,
  casesOf,
  leadersOn,
  type Metric as MetricKey,
  type VariantResult,
  variantsOf,
} from "@anpord/schema/domain/variant-comparison";
import { BLEED_ROW } from "@anpord/ui/lib/bleed-row";
import { cn } from "@anpord/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { CellVerdict } from "@/components/evals/cell-verdict";
import { CellVerdictNote } from "@/components/evals/cell-verdict-note";
import { RunStatusIcon } from "@/components/evals/eval-status-badge";
import { Metric } from "@/components/evals/metric";
import { VariantName } from "@/components/evals/variant-name";
import { RowTitle } from "@/components/layout/list-row";
import { count, NOTHING, seconds } from "@/lib/evals/duration";
import type { MetricName } from "@/lib/evals/metrics";

interface Column {
  readonly hint: string;
  readonly metric: MetricKey;
  readonly name: MetricName;
  readonly read: (result: VariantResult) => string;
}

/* A single cell reads as a tally, because 2/3 says more than 67% when there
   are three trials; several cells aggregate to a rate. */
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

/** Status, name, one column per metric, and the verdict against baseline. */
const TRACKS =
  "grid-cols-[auto_minmax(0,1fr)_repeat(4,auto)_auto] gap-x-4 gap-y-0";

const LINE = "col-span-full grid grid-cols-subgrid items-center";

const leadersOf = (results: readonly VariantResult[]) =>
  new Map(
    COLUMNS.map((column) => [column.metric, leadersOn(results, column.metric)])
  );

function Metrics({
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

function Verdict({ cell }: { readonly cell: EvalCell }) {
  return (
    <span className="flex min-w-5 justify-end">
      {cell.comparison === null ? null : (
        <CellVerdict comparison={cell.comparison} />
      )}
    </span>
  );
}

/**
 * One case, as a divider the variant rows hang under.
 *
 * Its tally counts cells rather than trials, because the question at this
 * level is which variants solved it, not how often each did.
 */
function CaseHeading({ result }: { readonly result: CaseResult }) {
  const solved = result.results.filter(
    (entry) => entry.scored > 0 && entry.passed === entry.scored
  ).length;

  return (
    <div className="col-span-full flex h-9 items-center gap-2.5 pt-2">
      <RowTitle>{result.name}</RowTitle>
      <span className="text-muted-foreground/70 text-xs tabular-nums">
        {solved}/{result.results.length}
      </span>
    </div>
  );
}

function CellLine({
  leaders,
  result,
  runId,
  title,
}: {
  readonly leaders: ReadonlyMap<MetricKey, ReadonlySet<number>>;
  readonly result: CellResult;
  readonly runId: string;
  readonly title: ReactNode;
}) {
  const { cell } = result;
  const line = cn(
    LINE,
    BLEED_ROW,
    "h-10 rounded-md text-label transition-colors",
    cell.cellKey === null ? null : "hover:bg-muted/50 hover:text-foreground"
  );

  const body = (
    <>
      <RunStatusIcon status={cell.status} />
      <span className="min-w-0 truncate">{title}</span>
      <Metrics leaders={leaders} result={result} />
      <Verdict cell={cell} />
    </>
  );

  const note = <CellVerdictNote cell={cell} />;

  if (cell.cellKey === null) {
    return (
      <>
        <div className={line}>{body}</div>
        <div className="col-span-full">{note}</div>
      </>
    );
  }

  return (
    <>
      <Link
        className={line}
        params={{ cellKey: cell.cellKey, runId }}
        to="/evals/$runId/cells/$cellKey"
      >
        {body}
      </Link>
      <div className="col-span-full">{note}</div>
    </>
  );
}

/**
 * Every variant across every case, under the cases it summarises.
 *
 * The leader on each metric is marked rather than the rows being sorted,
 * because there is no one order: the fastest variant is often not the one
 * that passed most, and sorting would have to pick which question the reader
 * came with. Two that tie are both marked; nothing is marked for a race of one.
 */
function Overall({ run }: { readonly run: EvalRun }) {
  const variants = variantsOf(run);
  const leaders = leadersOf(variants);

  return (
    <>
      <div className="col-span-full flex h-9 items-center gap-2.5 pt-2">
        <RowTitle>Overall</RowTitle>
        <span className="text-muted-foreground/70 text-xs">
          across {run.cases.length} cases
        </span>
      </div>

      {variants.map((variant) => (
        <div className={cn(LINE, "h-10 text-label")} key={variant.taskIndex}>
          <span />
          <span className="min-w-0 truncate">
            <VariantName task={variant.task} />
          </span>
          <Metrics leaders={leaders} result={variant} />
          <span />
        </div>
      ))}
    </>
  );
}

/**
 * The run as the grid it is: cases down, variants across.
 *
 * Two flat lists -- a table per variant, a list per cell -- made a reader
 * cross-reference them to answer the one question the grid exists for, which
 * is who did better on what. Grouped by case, the variants sit side by side
 * under the problem they were given, and the leader on each metric is marked
 * within that case. Several cases earn a footer that says who won overall.
 *
 * With one variant there is nothing to compare within a case, so each case
 * is a single row named for itself and the grouping disappears.
 */
export function RunGrid({ run }: { readonly run: EvalRun }) {
  const cases = casesOf(run);
  const single = run.tasks.length === 1;

  return (
    <div className={cn("grid", TRACKS)}>
      {cases.map((entry) => {
        const leaders = leadersOf(entry.results);

        return (
          <div
            className="col-span-full grid grid-cols-subgrid"
            key={entry.name}
          >
            {single ? null : <CaseHeading result={entry} />}

            {entry.results.map((result) => (
              <CellLine
                key={result.cell.cellKey ?? `${entry.name}-${result.taskIndex}`}
                leaders={leaders}
                result={result}
                runId={run.id}
                title={
                  single ? (
                    <RowTitle>{entry.name}</RowTitle>
                  ) : (
                    <VariantName task={result.task} />
                  )
                }
              />
            ))}
          </div>
        );
      })}

      {single || cases.length < 2 ? null : (
        <div className="col-span-full grid grid-cols-subgrid border-border-faint border-t">
          <Overall run={run} />
        </div>
      )}
    </div>
  );
}

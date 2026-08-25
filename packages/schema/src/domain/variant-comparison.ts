import type { EvalCell, EvalTask, EvalTrial } from "./evals";

/**
 * What a set of cells says about one variant.
 *
 * A run is a grid: cases down, variants across. The same reading serves two
 * questions -- how a variant did on one case, and how it did across all of
 * them -- so the shape is shared and only the cells fed in differ.
 */
export interface VariantResult {
  readonly cases: number;
  /** Median commands run, which is the cheapest proxy for how hard the agent
   * worked. Median rather than mean because one runaway trial should not
   * describe the other nine. */
  readonly commands: number | null;
  readonly modelMs: number | null;
  readonly passed: number;
  readonly passRate: number | null;
  readonly scored: number;
  readonly task: EvalTask;
  readonly taskIndex: number;
  readonly tokens: number | null;
}

/** One variant's attempt at one case: the cell, read as a result. */
export interface CellResult extends VariantResult {
  readonly cell: EvalCell;
}

/** One row of the grid: a case and how every variant fared on it. Variants
 * that never registered a cell for this case are absent rather than blank. */
export interface CaseResult {
  readonly name: string;
  readonly results: readonly CellResult[];
}

/** The metrics a variant can win on. Better is not the same direction for all
 * of them, which is why the direction travels with the name. */
export type Metric = "commands" | "modelMs" | "passRate" | "tokens";

export const METRIC_IS_LOWER_BETTER: Record<Metric, boolean> = {
  commands: true,
  modelMs: true,
  passRate: false,
  tokens: true,
};

const median = (values: readonly number[]) => {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].toSorted((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
    : (sorted[middle] ?? null);
};

/* Only trials that produced a verdict describe the variant. A trial that was
   voided never tested anything, and averaging its zero into a duration would
   make a variant that failed to start look fast. */
const scoredIn = (cells: readonly EvalCell[]): readonly EvalTrial[] =>
  cells.flatMap((cell) =>
    cell.trials.filter(
      (trial) => trial.status === "passed" || trial.status === "failed"
    )
  );

const variantOf = (
  cells: readonly EvalCell[],
  task: EvalTask,
  taskIndex: number
): VariantResult => {
  const trials = scoredIn(cells);
  const usage = trials.flatMap((trial) =>
    trial.usage === null ? [] : [trial.usage.totalTokens]
  );

  const passed = cells.reduce(
    (count, cell) => count + (cell.distribution?.passed ?? 0),
    0
  );
  const scored = cells.reduce(
    (count, cell) => count + (cell.distribution?.scored ?? 0),
    0
  );

  return {
    cases: cells.length,
    commands: median(trials.map((trial) => trial.commands)),
    modelMs: median(trials.map((trial) => trial.modelMs)),
    passRate: scored === 0 ? null : passed / scored,
    passed,
    scored,
    task,
    taskIndex,
    tokens: median(usage),
  };
};

interface Grid {
  readonly cases: readonly string[];
  readonly cells: readonly EvalCell[];
  readonly tasks: readonly EvalTask[];
}

/** One row per variant, across every case, in the order the run declared
 * them. */
export const variantsOf = (run: {
  readonly cells: readonly EvalCell[];
  readonly tasks: readonly EvalTask[];
}): readonly VariantResult[] =>
  run.tasks.flatMap((task, taskIndex) => {
    const cells = run.cells.filter((cell) => cell.taskIndex === taskIndex);

    return cells.length === 0 ? [] : [variantOf(cells, task, taskIndex)];
  });

/**
 * The grid, case by case, each holding its variants in declared order.
 *
 * Ordered by the run's own case list so the rows sit where the author put
 * them; a cell for a case the run did not list -- which should not happen,
 * but a grid is only as tidy as what was stored -- is appended rather than
 * dropped, because a result that ran deserves to be seen.
 */
export const casesOf = (run: Grid): readonly CaseResult[] => {
  const names = [
    ...new Set([...run.cases, ...run.cells.map((cell) => cell.caseName)]),
  ];

  return names.flatMap((name) => {
    const results = run.tasks.flatMap((task, taskIndex) =>
      run.cells
        .filter(
          (cell) => cell.caseName === name && cell.taskIndex === taskIndex
        )
        .map((cell) => ({ ...variantOf([cell], task, taskIndex), cell }))
    );

    return results.length === 0 ? [] : [{ name, results }];
  });
};

/**
 * The variants that lead on a metric.
 *
 * A set rather than one winner, because two variants that tie have both won
 * and marking one of them would be a claim the numbers do not make. Nothing
 * leads when only one variant ran: a race of one has no result.
 */
export const leadersOn = (
  variants: readonly VariantResult[],
  metric: Metric
): ReadonlySet<number> => {
  if (variants.length < 2) {
    return new Set();
  }

  const scored = variants.flatMap((variant) => {
    const value = variant[metric];

    return value === null ? [] : [{ taskIndex: variant.taskIndex, value }];
  });

  if (scored.length === 0) {
    return new Set();
  }

  const lower = METRIC_IS_LOWER_BETTER[metric];
  const best = scored.reduce(
    (found, entry) =>
      lower ? Math.min(found, entry.value) : Math.max(found, entry.value),
    scored[0]?.value ?? 0
  );

  return new Set(
    scored
      .filter((entry) => entry.value === best)
      .map((entry) => entry.taskIndex)
  );
};

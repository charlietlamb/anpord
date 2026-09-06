import type { EvalCell, EvalTask, EvalTrial } from "./evals";

/* Shared between one case and all of them: only the cells fed in differ. */
export interface VariantResult {
  readonly cases: number;
  /* Median rather than mean: one runaway trial should not describe the other nine. */
  readonly commands: number | null;
  readonly modelMs: number | null;
  readonly passed: number;
  readonly passRate: number | null;
  readonly scored: number;
  readonly task: EvalTask;
  readonly taskIndex: number;
  readonly tokens: number | null;
}

export interface CellResult extends VariantResult {
  readonly cell: EvalCell;
}

/* Variants with no cell for this case are absent rather than blank. */
export interface CaseResult {
  readonly name: string;
  readonly results: readonly CellResult[];
}

/* Better is not the same direction for all of them, hence METRIC_IS_LOWER_BETTER. */
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

/* Voided trials tested nothing; averaging their zero would make a failed start look fast. */
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

export const variantsOf = (run: {
  readonly cells: readonly EvalCell[];
  readonly tasks: readonly EvalTask[];
}): readonly VariantResult[] =>
  run.tasks.flatMap((task, taskIndex) => {
    const cells = run.cells.filter((cell) => cell.taskIndex === taskIndex);

    return cells.length === 0 ? [] : [variantOf(cells, task, taskIndex)];
  });

/* A cell for a case the run did not list is appended rather than dropped. */
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

/* A set, not one winner: ties have both won, and a race of one has no result. */
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

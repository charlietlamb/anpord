import type { EvalCell, EvalTask, EvalTrial } from "./evals";

/**
 * What a run says about one variant, across every case it was given.
 *
 * A run is a grid: cases down, variants across. Read as the flat list of cells
 * it is stored as, the reader has to group it by eye to answer the question
 * the grid exists for, which is which setup did better.
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

/** One row per variant, in the order the run declared them. */
export const variantsOf = (run: {
  readonly cells: readonly EvalCell[];
  readonly tasks: readonly EvalTask[];
}): readonly VariantResult[] =>
  run.tasks.flatMap((task, taskIndex) => {
    const cells = run.cells.filter((cell) => cell.taskIndex === taskIndex);

    return cells.length === 0 ? [] : [variantOf(cells, task, taskIndex)];
  });

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

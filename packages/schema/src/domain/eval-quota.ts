/**
 * What one organisation may have running at once, and what one run may hold.
 *
 * A trial is a virtual machine. Cells run eight at a time and each cell runs
 * up to ten trials, so one accepted run can want eighty simultaneous VMs, and
 * nothing about starting a run is slow enough to make starting many of them
 * hard. These are the numbers between a customer and every sandbox the
 * platform can open.
 */

/** The most trials one run may contain, across every case, task and repeat.
 *
 * A hundred is a ten-by-ten grid run once, or a five-case grid across four
 * agents run five times: past that a person is measuring something a single
 * run is the wrong shape for, and each trial past it is another VM. */
export const MAX_RUN_TRIALS = 100;

/** The most runs one organisation may have in `running` status.
 *
 * Three, because MAX_RUN_TRIALS already bounds a single run and this bounds
 * the multiple: three hundred trials in flight is the ceiling, which is what
 * the provider accounts are provisioned for. A run settles on its own, so this
 * throttles rather than forbids -- a fourth start is refused now and accepted
 * when one of the three finishes. */
export const MAX_ORGANIZATION_RUNS_IN_FLIGHT = 3;

/* The per-array bounds a decode enforces before the product above is even
   computed, so a payload naming a million cases is refused by the wire rather
   than by arithmetic over a decoded array. Each is a ceiling that
   MAX_RUN_TRIALS makes unreachable in combination; they exist so that no one
   dimension can be large on its own. */
export const MAX_START_CASES = 100;

/** A task is one harness, model, provider and profile combination -- a column
 * of the grid. Twenty distinct columns is already far past any grid a person
 * reads. */
export const MAX_START_TASKS = 20;

export const MAX_START_TRIALS = 10;

export interface StartSize {
  readonly cases: number;
  readonly tasks: number;
  readonly trials: number;
}

/** How many sandboxes a start is asking for. */
export const trialsRequested = (size: StartSize) =>
  size.cases * size.tasks * size.trials;

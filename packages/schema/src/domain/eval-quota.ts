/* Each trial is a virtual machine, so these bound how many sandboxes a customer can open at once. */

export const MAX_RUN_TRIALS = 100;

/* Three, so 300 trials in flight is the ceiling the provider accounts are provisioned for; a refused start succeeds once one settles. */
export const MAX_ORGANIZATION_RUNS_IN_FLIGHT = 3;

/* Per-array bounds the decode enforces, so a payload naming a million cases is refused on the wire rather than by arithmetic over a decoded array. */
export const MAX_START_CASES = 100;

export const MAX_START_TASKS = 20;

export const MAX_START_TRIALS = 10;

export interface StartSize {
  readonly cases: number;
  readonly tasks: number;
  readonly trials: number;
}

export const trialsRequested = (size: StartSize) =>
  size.cases * size.tasks * size.trials;

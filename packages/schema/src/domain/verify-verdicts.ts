import type { EvalVerifyStep } from "./evals";

/**
 * What the trials said about one condition of the verifier.
 *
 * `unknown` is a trial recorded before the trail existed, or a verifier of
 * one command, which reports nothing per step. `unreached` is a step the
 * script never got to because an earlier one failed: nothing was measured
 * for it, and it is drawn as such rather than as a pass it did not earn.
 */
export type StepVerdict = "failed" | "passed" | "unknown" | "unreached";

const byIndex = (
  steps: readonly string[],
  trail: readonly EvalVerifyStep[]
): readonly (number | null)[] =>
  steps.map((step, index) => {
    const found = trail[index];

    return found === undefined || found.command !== step
      ? null
      : found.exitCode;
  });

/**
 * One verdict per step, across every trial that left a trail.
 *
 * A step that failed in any trial failed: one counterexample is a finding.
 * A step that held in every trial that reached it passed, because that is
 * every time it was tested. A step no trial reached is unreached.
 */
export const verdictsOf = (
  steps: readonly string[],
  trials: readonly { readonly verifySteps: readonly EvalVerifyStep[] }[]
): readonly StepVerdict[] => {
  const trails = trials
    .map((trial) => trial.verifySteps)
    .filter((trail) => trail.length > 0)
    .map((trail) => byIndex(steps, trail));

  if (trails.length === 0) {
    return steps.map(() => "unknown");
  }

  return steps.map((_, index) => {
    const codes = trails.flatMap((trail) => {
      const code = trail[index];

      return code === null || code === undefined ? [] : [code];
    });

    if (codes.some((code) => code !== 0)) {
      return "failed";
    }

    return codes.length === 0 ? "unreached" : "passed";
  });
};

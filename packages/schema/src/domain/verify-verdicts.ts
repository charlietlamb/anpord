import type { EvalVerifyStep } from "./evals";

/* `unknown` is a trial predating the trail or a one-command verifier; `unreached` is a step an earlier failure stopped, never a pass. */
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

/* One failing trial fails the step; passing means it held in every trial that reached it. */
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

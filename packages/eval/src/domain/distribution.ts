import type { TrialOutcome } from "./trial";

export interface Distribution {
  readonly commandMax: number;
  readonly commandMedian: number;
  readonly commandMin: number;
  readonly deterministic: boolean;
  readonly failed: number;
  readonly passed: number;
  readonly passRate: number;
  readonly scored: number;
  readonly trials: number;
  readonly voided: number;
}

/* Deliberately small: the spread is the finding. */
const COMMAND_AGREEMENT = 4;

const median = (values: readonly number[]) => {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
    : (sorted[middle] ?? 0);
};

export const distributionOf = (
  outcomes: readonly TrialOutcome[]
): Distribution => {
  const voided = outcomes.filter((outcome) => outcome.status === "void");
  const scored = outcomes.filter((outcome) => outcome.status !== "void");
  const passed = scored.filter((outcome) => outcome.passed);
  const commands = scored.map((outcome) => outcome.commandCount);

  const commandMin = commands.length === 0 ? 0 : Math.min(...commands);
  const commandMax = commands.length === 0 ? 0 : Math.max(...commands);

  const agreed = passed.length === scored.length || passed.length === 0;

  /* Absolute, not a ratio: a ratio would permit a 50-command swing at 100 commands. */
  const tight = commandMax - commandMin <= COMMAND_AGREEMENT;

  return {
    commandMax,
    commandMedian: median(commands),
    commandMin,
    deterministic: scored.length > 1 && agreed && tight,
    failed: scored.length - passed.length,
    passRate: scored.length === 0 ? 0 : passed.length / scored.length,
    passed: passed.length,
    scored: scored.length,
    trials: outcomes.length,
    voided: voided.length,
  };
};

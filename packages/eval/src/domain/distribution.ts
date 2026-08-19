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

/**
 * What gets reported for a cell.
 *
 * The denominator is scored trials, not all trials: a voided trial produced no
 * evidence, so counting it as a failure would invent one. It is reported
 * separately instead, because a cell with four voids is a finding about the
 * provider rather than about the agent.
 */
export const distributionOf = (
  outcomes: readonly TrialOutcome[]
): Distribution => {
  const voided = outcomes.filter((outcome) => outcome.status === "void");
  const scored = outcomes.filter((outcome) => outcome.status !== "void");
  const passed = scored.filter((outcome) => outcome.passed);
  const commands = scored.map((outcome) => outcome.commandCount);

  const commandMin = commands.length === 0 ? 0 : Math.min(...commands);
  const commandMax = commands.length === 0 ? 0 : Math.max(...commands);

  /* A cell is deterministic when every scored trial agreed and they took
     roughly the same number of commands. Passing 7 of 10 in 9 to 41 commands
     is a different animal from passing 10 of 10 in 9 to 11, and reporting
     only a rate would call them the same. */
  const agreed = passed.length === scored.length || passed.length === 0;
  const tight = commandMax <= commandMin * 1.5;

  return {
    commandMax,
    commandMedian: median(commands),
    commandMin,
    deterministic: scored.length > 0 && agreed && tight,
    failed: scored.length - passed.length,
    passRate: scored.length === 0 ? 0 : passed.length / scored.length,
    passed: passed.length,
    scored: scored.length,
    trials: outcomes.length,
    voided: voided.length,
  };
};

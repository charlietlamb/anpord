import type { EvalDistribution, EvalTrial } from "@anpord/schema/domain/evals";

const COMMAND_AGREEMENT = 4;

const median = (values: readonly number[]) => {
  if (values.length === 0) {
    return 0;
  }
  const sorted = values.toSorted((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
    : (sorted[middle] ?? 0);
};

export const distributionOf = (
  trials: readonly Pick<EvalTrial, "commands" | "status">[]
): EvalDistribution => {
  const voided = trials.filter((trial) => trial.status === "void");
  const scored = trials.filter(
    (trial) => trial.status === "passed" || trial.status === "failed"
  );
  const passed = scored.filter((trial) => trial.status === "passed");
  const commands = scored.map((trial) => trial.commands);
  const commandMin = commands.length === 0 ? 0 : Math.min(...commands);
  const commandMax = commands.length === 0 ? 0 : Math.max(...commands);
  const agreed = passed.length === scored.length || passed.length === 0;

  return {
    commandMax,
    commandMedian: median(commands),
    commandMin,
    deterministic:
      scored.length > 1 &&
      agreed &&
      commandMax - commandMin <= COMMAND_AGREEMENT,
    failed: scored.length - passed.length,
    passRate: scored.length === 0 ? 0 : passed.length / scored.length,
    passed: passed.length,
    scored: scored.length,
    trials: trials.length,
    voided: voided.length,
  };
};

import type { EvalRun, EvalTrial } from "@anpord/schema/domain/evals";
import {
  CONCERN_REASONS,
  type TokenCounts,
  type UsageConcern,
  usageConcerns,
} from "@anpord/schema/domain/usage-health";

const THOUSAND = 1000;
const MILLION = 1_000_000;
const CENT = 0.01;

export interface RunUsage {
  readonly concerns: readonly UsageConcern[];
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly totalTokens: number;
  readonly usd: number | null;
}

const trialsOf = (run: EvalRun): readonly EvalTrial[] =>
  run.cells.flatMap((cell) => cell.trials);

export const runUsage = (run: EvalRun): RunUsage => {
  const concerns = new Set<UsageConcern>();
  let inputTokens = 0;
  let outputTokens = 0;
  let totalTokens = 0;

  for (const trial of trialsOf(run)) {
    if (!trial.usage) {
      continue;
    }

    inputTokens += trial.usage.inputTokens;
    outputTokens += trial.usage.outputTokens;
    totalTokens += trial.usage.totalTokens;

    for (const concern of usageConcerns({
      turns: trial.commands,
      usage: trial.usage,
    })) {
      concerns.add(concern);
    }
  }

  return {
    concerns: [...concerns],
    inputTokens,
    outputTokens,
    totalTokens,
    usd: run.costs?.estimatedEquivalentUsd ?? null,
  };
};

export const formatTokens = (value: number) => {
  if (value >= MILLION) {
    return `${(value / MILLION).toFixed(1)}M`;
  }

  return value >= THOUSAND ? `${Math.round(value / THOUSAND)}k` : String(value);
};

export const formatUsd = (value: number) =>
  value < CENT ? "<$0.01" : `$${value.toFixed(2)}`;

export const usageLines = (usage: RunUsage): readonly string[] => {
  if (usage.totalTokens === 0) {
    return [];
  }

  const spend = usage.usd === null ? "" : `, ${formatUsd(usage.usd)} est.`;

  return [
    `${formatTokens(usage.totalTokens)} tokens (${formatTokens(usage.inputTokens)} in, ${formatTokens(usage.outputTokens)} out)${spend}`,
    ...usage.concerns.map((concern) => CONCERN_REASONS[concern]),
  ];
};

export interface LocalReading {
  readonly turns: number;
  readonly usage: TokenCounts | null;
}

export const localUsage = (cases: readonly LocalReading[]): RunUsage => {
  const concerns = new Set<UsageConcern>();
  let inputTokens = 0;
  let outputTokens = 0;
  let totalTokens = 0;

  for (const one of cases) {
    if (!one.usage) {
      continue;
    }

    inputTokens += one.usage.inputTokens;
    outputTokens += one.usage.outputTokens;
    totalTokens += one.usage.inputTokens + one.usage.outputTokens;

    for (const concern of usageConcerns({
      turns: one.turns,
      usage: one.usage,
    })) {
      concerns.add(concern);
    }
  }

  return {
    concerns: [...concerns],
    inputTokens,
    outputTokens,
    totalTokens,
    usd: null,
  };
};

export const localUsageLines = (cases: readonly LocalReading[]) =>
  usageLines(localUsage(cases)).map((line) => `  ${line}`);

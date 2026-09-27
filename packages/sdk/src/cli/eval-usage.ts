import {
  COST_COMPONENT_LABELS,
  type EvalCosts,
} from "@anpord/schema/domain/eval-costs";
import type { EvalBatch } from "@anpord/schema/domain/evals";
import {
  CONCERN_REASONS,
  type TokenCounts,
  type UsageConcern,
  usageConcerns,
} from "@anpord/schema/domain/usage-health";

const THOUSAND = 1000;
const MILLION = 1_000_000;
export const CENT = 0.01;

interface Usage {
  readonly concerns: readonly UsageConcern[];
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly totalTokens: number;
  readonly usd: number | null;
}

interface Reading<T extends TokenCounts> {
  readonly commands: number;
  readonly usage: T | null | undefined;
}

const sumUsage = <T extends TokenCounts>(
  readings: readonly Reading<T>[],
  totalOf: (usage: T) => number,
  usd: number | null
): Usage => {
  const concerns = new Set<UsageConcern>();
  let inputTokens = 0;
  let outputTokens = 0;
  let totalTokens = 0;

  for (const reading of readings) {
    if (!reading.usage) {
      continue;
    }

    inputTokens += reading.usage.inputTokens;
    outputTokens += reading.usage.outputTokens;
    totalTokens += totalOf(reading.usage);

    for (const concern of usageConcerns({
      turns: reading.commands,
      usage: reading.usage,
    })) {
      concerns.add(concern);
    }
  }

  return {
    concerns: [...concerns],
    inputTokens,
    outputTokens,
    totalTokens,
    usd,
  };
};

export const batchUsage = (batch: EvalBatch): Usage =>
  sumUsage(
    batch.runs.flatMap((run) => run.trials),
    (usage) => usage.totalTokens,
    batch.costs?.estimatedEquivalentUsd ?? null
  );

export const formatTokens = (value: number) => {
  if (value >= MILLION) {
    return `${(value / MILLION).toFixed(1)}M`;
  }

  return value >= THOUSAND ? `${Math.round(value / THOUSAND)}k` : String(value);
};

export const formatUsd = (value: number) =>
  value < CENT ? "<$0.01" : `$${value.toFixed(2)}`;

export const usageLines = (usage: Usage): readonly string[] => {
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
  readonly commands: number;
  readonly usage: TokenCounts | null;
}

const PAYERS = ["model", "user", "judge"] as const;

const breakdownLine = (costs: EvalCosts | null) => {
  const parts = PAYERS.flatMap(
    (component) =>
      costs?.components
        .filter((part) => part.component === component)
        .map(
          ({ usd }) =>
            `${COST_COMPONENT_LABELS[component]} ${usd === null ? "not priced" : formatUsd(usd)}`
        ) ?? []
  );

  return parts.length > 1 ? [parts.join(", ")] : [];
};

export interface LocalUsage {
  readonly concerns: readonly string[];
  readonly lines: readonly string[];
}

export const localUsage = (
  cases: readonly LocalReading[],
  costs: EvalCosts | null = null
): LocalUsage => {
  const [spend, ...concerns] = usageLines(
    sumUsage(
      cases,
      (usage) => usage.inputTokens + usage.outputTokens,
      costs?.estimatedEquivalentUsd ?? null
    )
  );

  return spend === undefined
    ? { concerns: [], lines: [] }
    : { concerns, lines: [spend, ...breakdownLine(costs)] };
};

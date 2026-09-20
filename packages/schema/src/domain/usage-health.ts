const CACHE_FLOOR = 50_000;
const PER_TURN_CEILING = 12_000;

export type UsageConcern = "context-grew-fast" | "nothing-cached";

export interface TokenCounts {
  readonly cacheReadTokens: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
}

export interface UsageReading {
  readonly turns: number;
  readonly usage: TokenCounts;
}

export const perTurnInput = ({ turns, usage }: UsageReading) =>
  turns <= 0 ? usage.inputTokens : Math.round(usage.inputTokens / turns);

export const usageConcerns = (
  reading: UsageReading
): readonly UsageConcern[] => {
  const { usage } = reading;
  const served = usage.inputTokens + usage.cacheReadTokens;
  const concerns: UsageConcern[] = [];

  if (perTurnInput(reading) >= PER_TURN_CEILING) {
    concerns.push("context-grew-fast");
  }

  if (served >= CACHE_FLOOR && usage.cacheReadTokens === 0) {
    concerns.push("nothing-cached");
  }

  return concerns;
};

export const CONCERN_REASONS: Record<UsageConcern, string> = {
  "context-grew-fast":
    "Each turn carried a large context, which is what happens when an agent reads a dependency or a long file into the conversation and then re-sends it every turn after.",
  "nothing-cached":
    "Nothing was served from cache, so every turn paid full price for the turns before it.",
};

import { Option } from "effect";
import type { HarnessUsage } from "./harness-event";

export const NO_USAGE: HarnessUsage = {
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  inputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
};

const plus = (left: HarnessUsage, right: HarnessUsage): HarnessUsage => ({
  cacheReadTokens: left.cacheReadTokens + right.cacheReadTokens,
  cacheWriteTokens: left.cacheWriteTokens + right.cacheWriteTokens,
  inputTokens: left.inputTokens + right.inputTokens,
  outputTokens: left.outputTokens + right.outputTokens,
  totalTokens: left.totalTokens + right.totalTokens,
});

export interface UsageTally {
  readonly total: HarnessUsage;
  readonly turns: readonly HarnessUsage[];
}

export const EMPTY_TALLY: UsageTally = { total: NO_USAGE, turns: [] };

/* A cumulative report replaces the total: it already contains every prior turn. */
export const tallied = (
  tally: UsageTally,
  usage: HarnessUsage,
  cumulative: boolean
): UsageTally =>
  cumulative
    ? { total: usage, turns: tally.turns }
    : { total: plus(tally.total, usage), turns: [...tally.turns, usage] };

/* None, not zero: a harness reporting no usage differs from one reporting zero. */
export const totalOf = (tally: UsageTally): Option.Option<HarnessUsage> =>
  tally.turns.length === 0 && tally.total.totalTokens === 0
    ? Option.none()
    : Option.some(tally.total);

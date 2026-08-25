import { Option } from "effect";
import type { HarnessUsage } from "./harness-event";

/** Nothing counted yet. */
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

/**
 * What a run has spent, and what each turn of it spent.
 *
 * Held as both because they answer different questions: the total is what the
 * trial cost, and the turns are where it went. Keeping only the total was
 * what made a waterfall unable to say which step was expensive.
 */
export interface UsageTally {
  readonly total: HarnessUsage;
  /** Each turn's own share, in the order the turns were reported. */
  readonly turns: readonly HarnessUsage[];
}

export const EMPTY_TALLY: UsageTally = { total: NO_USAGE, turns: [] };

/**
 * Fold one report into the tally.
 *
 * A cumulative report replaces the total rather than adding to it: it already
 * contains every turn counted so far, and adding it would count them twice.
 * It contributes no turn of its own, because it describes all of them.
 */
export const tallied = (
  tally: UsageTally,
  usage: HarnessUsage,
  cumulative: boolean
): UsageTally =>
  cumulative
    ? { total: usage, turns: tally.turns }
    : { total: plus(tally.total, usage), turns: [...tally.turns, usage] };

/**
 * The total, or none when nothing was ever reported.
 *
 * A harness that reports no usage is different from one that reports zero,
 * and callers store null for the first.
 */
export const totalOf = (tally: UsageTally): Option.Option<HarnessUsage> =>
  tally.turns.length === 0 && tally.total.totalTokens === 0
    ? Option.none()
    : Option.some(tally.total);

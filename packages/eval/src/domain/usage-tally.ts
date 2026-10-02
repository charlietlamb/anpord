import type { HarnessUsage } from "@sphynx/schema/domain/harness-event";
import { Option } from "effect";

export const NO_USAGE: HarnessUsage = {
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  inputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
};

const hourWritesOf = (left: HarnessUsage, right: HarnessUsage) =>
  left.cacheWrite1hTokens === undefined &&
  right.cacheWrite1hTokens === undefined
    ? {}
    : {
        cacheWrite1hTokens:
          (left.cacheWrite1hTokens ?? 0) + (right.cacheWrite1hTokens ?? 0),
      };

const plus = (left: HarnessUsage, right: HarnessUsage): HarnessUsage => ({
  ...hourWritesOf(left, right),
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

export type ResumeSupport =
  | "unsupported"
  | "usage-per-run"
  | "usage-per-session";

export const reportsWholeSession = (
  support: ResumeSupport,
  resume: Option.Option<string>
) => Option.isSome(resume) && support === "usage-per-session";

export const throughRun = (
  carried: Option.Option<HarnessUsage>,
  reported: Option.Option<HarnessUsage>,
  reportsWholeSession: boolean
): Option.Option<HarnessUsage> => {
  if (Option.isNone(reported)) {
    return carried;
  }

  return Option.isNone(carried) || reportsWholeSession
    ? reported
    : Option.some(plus(carried.value, reported.value));
};

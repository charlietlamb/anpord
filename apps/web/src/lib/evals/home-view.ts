import {
  type EvalHome,
  type EvalHomeEval,
  type EvalHomeRange,
  type EvalHomeVerdict,
  variantLabel,
} from "@anpord/schema/domain/eval-home";
import type { EvalTrigger } from "@anpord/schema/domain/eval-trigger";
import type { EvalBatchSummary, EvalSuite } from "@anpord/schema/domain/evals";
import {
  axisFloor,
  type DailyRate,
  dailyRates,
  dayAxis,
  percentOf,
  rateDelta,
  regressionIndex,
} from "@/lib/evals/home-trend";

export interface HomeFilters {
  readonly range: EvalHomeRange;
  readonly reason: string | null;
  readonly suite: string | null;
  readonly variant: string | null;
  readonly verdict: EvalHomeVerdict | null;
}

export interface HomeTally {
  readonly failing: number;
  readonly flaky: number;
  readonly passing: number;
  readonly passRate: number | null;
  readonly total: number;
  readonly unscored: number;
}

export interface HomeCell {
  readonly caseId: string;
  readonly caseName: string;
  readonly dim: boolean;
  readonly key: string;
  readonly variant: string;
  readonly verdict: EvalHomeVerdict;
}

interface HomeListed {
  readonly caseId: string;
  readonly caseName: string;
  readonly detail: string;
  readonly key: string;
  readonly verdict: EvalHomeVerdict;
}

export interface HomeSuiteCard {
  readonly cells: readonly HomeCell[];
  readonly listed: readonly HomeListed[];
  readonly suite: EvalSuite;
  readonly tally: HomeTally;
  readonly trend: readonly DailyRate[];
}

type HomeReasonKind = "check" | "unscored";

export interface HomeReason {
  readonly count: number;
  readonly kind: HomeReasonKind;
  readonly label: string;
}

export const PERIOD: Record<EvalHomeRange, string> = {
  "7d": "this week",
  "30d": "this month",
  "90d": "this quarter",
};

const SOURCE_LABEL: Record<EvalTrigger["source"], string> = {
  api: "API",
  ci: "CI",
  cli: "Local",
  dashboard: "Dashboard",
  mcp: "MCP",
};

export interface HomeRun {
  readonly at: EvalBatchSummary["startedAt"];
  readonly failed: number;
  readonly id: string;
  readonly passed: number;
  readonly source: string;
  readonly total: number;
  readonly voided: number;
}

const runOf = (batch: EvalBatchSummary): HomeRun => ({
  at: batch.finishedAt ?? batch.startedAt,
  failed: batch.scored - batch.passed,
  id: batch.id,
  passed: batch.passed,
  source:
    batch.trigger === null ? "Unknown" : SOURCE_LABEL[batch.trigger.source],
  total: batch.scored + batch.voided,
  voided: batch.voided,
});

const FEATURED = 3;
const LISTED = 3;
const UNSCORED_FALLBACK = "Not scored";

const labelOf = (entry: EvalHomeEval) => variantLabel(entry.variant);

const tallyOf = (evals: readonly EvalHomeEval[]): HomeTally => {
  const count = (verdict: EvalHomeVerdict) =>
    evals.filter((entry) => entry.verdict === verdict).length;
  const passing = count("passed");
  const failing = count("failed");
  const flaky = count("flaky");
  const rate = percentOf(passing, passing + failing + flaky);
  return {
    failing,
    flaky,
    passing,
    passRate: rate === null ? null : Math.round(rate),
    total: evals.length,
    unscored: count("unscored"),
  };
};

const reasonOf = (entry: EvalHomeEval) => {
  if (entry.verdict === "unscored") {
    return entry.unscoredReason ?? UNSCORED_FALLBACK;
  }
  return entry.verdict === "passed" ? null : (entry.failure?.check ?? null);
};

const focusOf = (filters: HomeFilters) => {
  if (filters.reason !== null) {
    return (entry: EvalHomeEval) => reasonOf(entry) === filters.reason;
  }
  if (filters.verdict !== null) {
    return (entry: EvalHomeEval) => entry.verdict === filters.verdict;
  }
  return null;
};

const byName = (a: EvalHomeEval, b: EvalHomeEval) =>
  a.caseName.localeCompare(b.caseName) || labelOf(a).localeCompare(labelOf(b));

const suiteCard = (
  evals: readonly EvalHomeEval[],
  trend: readonly DailyRate[],
  focus: ((entry: EvalHomeEval) => boolean) | null
): HomeSuiteCard => {
  const sorted = [...evals].sort(byName);
  const listed = sorted.filter(
    focus ?? ((entry) => entry.verdict === "failed")
  );
  return {
    cells: sorted.map((entry) => ({
      caseId: entry.caseId,
      caseName: entry.caseName,
      dim: focus !== null && !focus(entry),
      key: entry.runId,
      variant: labelOf(entry),
      verdict: entry.verdict,
    })),
    listed: listed.slice(0, LISTED).map((entry) => ({
      caseId: entry.caseId,
      caseName: entry.caseName,
      detail: reasonOf(entry) ?? labelOf(entry),
      key: entry.runId,
      verdict: entry.verdict,
    })),
    suite: sorted[0].suite,
    tally: tallyOf(evals),
    trend,
  };
};

const byConcern = (a: HomeSuiteCard, b: HomeSuiteCard) =>
  b.tally.failing - a.tally.failing ||
  b.tally.total - a.tally.total ||
  a.suite.name.localeCompare(b.suite.name);

const groupBy = <T>(items: readonly T[], keyOf: (item: T) => string) =>
  items.reduce((groups, item) => {
    const key = keyOf(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
    return groups;
  }, new Map<string, T[]>());

const reasonsOf = (evals: readonly EvalHomeEval[]): HomeReason[] =>
  [
    ...groupBy(
      evals.filter((entry) => reasonOf(entry) !== null),
      (entry) => reasonOf(entry) ?? ""
    ),
  ]
    .map(([label, members]) => ({
      count: members.length,
      kind:
        members[0].verdict === "unscored"
          ? ("unscored" as const)
          : ("check" as const),
      label,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

export const homeView = (home: EvalHome, filters: HomeFilters) => {
  const evals = home.evals.filter(
    (entry) =>
      (filters.suite === null || entry.suite.id === filters.suite) &&
      (filters.variant === null || labelOf(entry) === filters.variant)
  );
  const days = home.days.filter(
    (day) =>
      (filters.suite === null || day.suiteId === filters.suite) &&
      (filters.variant === null || day.variant === filters.variant)
  );
  const axis = dayAxis(home.days);
  const overall = dailyRates(axis, days);
  const tally = tallyOf(evals);
  const delta = rateDelta(axis, days);
  const newlyFailing = evals.filter((entry) => entry.newlyFailing).length;
  const focus = focusOf(filters);

  const cards = [...groupBy(evals, (entry) => entry.suite.id)]
    .flatMap(([suiteId, members]) => {
      const card = suiteCard(
        members,
        dailyRates(
          axis,
          days.filter((day) => day.suiteId === suiteId)
        ),
        focus
      );
      return focus === null || card.listed.length > 0 ? [card] : [];
    })
    .sort(byConcern);

  const allVariants = [...new Set(home.evals.map(labelOf))];
  const variants = [...new Set(evals.map(labelOf))];
  const suites = [...new Map(evals.map((e) => [e.suite.id, e.suite]))]
    .map(([, suite]) => suite)
    .sort((a, b) => a.name.localeCompare(b.name));
  const series = [...new Set(days.map((day) => day.variant))].map((label) => ({
    label,
    slot: allVariants.indexOf(label),
    rates: dailyRates(
      axis,
      days.filter((day) => day.variant === label)
    ),
  }));

  return {
    compact: cards.slice(FEATURED),
    delta,
    featured: cards.slice(0, FEATURED),
    grid: {
      rows: suites.map((suite) => ({
        cells: variants.map(
          (label) =>
            tallyOf(
              evals.filter(
                (entry) =>
                  entry.suite.id === suite.id && labelOf(entry) === label
              )
            ).passRate
        ),
        suite,
      })),
      variants,
    },
    newlyFailing,
    options: {
      suites: [...new Map(home.evals.map((e) => [e.suite.id, e.suite]))].map(
        ([, suite]) => suite
      ),
      variants: allVariants,
    },
    overall,
    reasons: reasonsOf(evals),
    runs: home.recentBatches.map(runOf),
    tally,
    trend: {
      axis,
      floor: axisFloor(series.flatMap((entry) => entry.rates)),
      regressedAt: regressionIndex(overall),
      series,
    },
  };
};

export type HomeView = ReturnType<typeof homeView>;

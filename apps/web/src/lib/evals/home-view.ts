import {
  type EvalHome,
  type EvalHomeBatch,
  type EvalHomeEval,
  type EvalHomeRange,
  type EvalHomeVerdict,
  variantLabel,
} from "@anpord/schema/domain/eval-home";
import type { EvalTrigger } from "@anpord/schema/domain/eval-trigger";
import type { EvalSuite } from "@anpord/schema/domain/evals";
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

export interface HomeSuiteRow {
  readonly cells: readonly HomeCell[];
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

export type TrialOutcome = "passed" | "failed" | "void";

export interface HomeRun {
  readonly at: EvalHomeBatch["batch"]["startedAt"];
  readonly id: string;
  readonly name: string;
  readonly scope: string;
  readonly source: string;
  readonly trials: readonly TrialOutcome[];
}

const TRIAL_SQUARES = 32;

const plural = (count: number, noun: string) =>
  count === 1 ? `1 ${noun}` : `${count} ${noun}s`;

const trialsOf = (passed: number, failed: number, voided: number) => {
  const total = passed + failed + voided;
  const scale = total > TRIAL_SQUARES ? TRIAL_SQUARES / total : 1;
  const share = (count: number) =>
    count === 0 ? 0 : Math.max(1, Math.round(count * scale));
  return [
    ...new Array<TrialOutcome>(share(passed)).fill("passed"),
    ...new Array<TrialOutcome>(share(failed)).fill("failed"),
    ...new Array<TrialOutcome>(share(voided)).fill("void"),
  ];
};

const nameOf = ({ caseName, suiteName, suites }: EvalHomeBatch) =>
  caseName ?? suiteName ?? plural(suites, "suite");

const runOf = (recent: EvalHomeBatch): HomeRun => {
  const { batch } = recent;
  return {
    at: batch.finishedAt ?? batch.startedAt,
    id: batch.id,
    name: nameOf(recent),
    scope: plural(batch.cases, "case"),
    source:
      batch.trigger === null ? "Unknown" : SOURCE_LABEL[batch.trigger.source],
    trials: trialsOf(batch.passed, batch.scored - batch.passed, batch.voided),
  };
};

const SUITES_SHOWN = 6;
const VARIANTS_SHOWN = 8;
const UNSCORED_FALLBACK = "Not scored";

const labelOf = (entry: EvalHomeEval) => variantLabel(entry.variant);

const VERDICT_ORDER: Record<EvalHomeVerdict, number> = {
  passed: 0,
  flaky: 1,
  failed: 2,
  unscored: 3,
};

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

const cellOf =
  (focus: ((entry: EvalHomeEval) => boolean) | null) =>
  (entry: EvalHomeEval): HomeCell => ({
    caseId: entry.caseId,
    caseName: entry.caseName,
    dim: focus !== null && !focus(entry),
    key: entry.runId,
    variant: labelOf(entry),
    verdict: entry.verdict,
  });

const byConcern = (a: HomeSuiteRow, b: HomeSuiteRow) =>
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
  const newlyFailing = evals.filter(
    (entry) => entry.newlyFailing && entry.verdict === "failed"
  ).length;
  const focus = focusOf(filters);

  const suiteRows = [...groupBy(evals, (entry) => entry.suite.id)]
    .flatMap(([suiteId, members]): HomeSuiteRow[] => {
      if (focus !== null && !members.some(focus)) {
        return [];
      }
      const sorted = [...members].sort(byName);
      return [
        {
          cells: sorted.map(cellOf(focus)),
          suite: sorted[0].suite,
          tally: tallyOf(members),
          trend: dailyRates(
            axis,
            days.filter((day) => day.suiteId === suiteId)
          ),
        },
      ];
    })
    .sort(byConcern);

  const variantRows = [...groupBy(evals, labelOf)]
    .map(([label, members]) => ({
      cells: [...members]
        .sort((a, b) => VERDICT_ORDER[a.verdict] - VERDICT_ORDER[b.verdict])
        .map(cellOf(focus)),
      label,
      tally: tallyOf(members),
    }))
    .sort(
      (a, b) =>
        (a.tally.passRate ?? 101) - (b.tally.passRate ?? 101) ||
        a.label.localeCompare(b.label)
    );

  const allVariants = [...new Set(home.evals.map(labelOf))];
  const series = [...new Set(days.map((day) => day.variant))].map((label) => ({
    label,
    slot: allVariants.indexOf(label),
    rates: dailyRates(
      axis,
      days.filter((day) => day.variant === label)
    ),
  }));

  return {
    delta,
    moreSuites: Math.max(0, suiteRows.length - SUITES_SHOWN),
    moreVariants: Math.max(0, variantRows.length - VARIANTS_SHOWN),
    newlyFailing,
    options: {
      suites: [...new Map(home.evals.map((e) => [e.suite.id, e.suite]))].map(
        ([, suite]) => suite
      ),
      variants: allVariants,
    },
    overall,
    reasons: reasonsOf(evals),
    suites: suiteRows.slice(0, SUITES_SHOWN),
    variants: variantRows.slice(0, VARIANTS_SHOWN),
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

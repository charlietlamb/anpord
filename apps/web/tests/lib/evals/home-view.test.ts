import { describe, expect, test } from "bun:test";
import type {
  EvalHome,
  EvalHomeDay,
  EvalHomeEval,
  EvalHomeVerdict,
} from "@sphynx/schema/domain/eval-home";
import { DateTime } from "effect";
import { regressionIndex } from "@/lib/evals/home-trend";
import { type HomeFilters, homeView } from "@/lib/evals/home-view";

const LUNA = {
  harness: "codex",
  id: "evar_luna",
  model: "gpt-5.6-luna",
  profile: null,
  sandbox: "e2b",
  userModel: null,
} as const;

const OPUS = {
  ...LUNA,
  harness: "claude",
  id: "evar_opus",
  model: "opus",
  profile: "setup",
} as const;

const BASICS = { id: "autumn-basics", name: "autumn/basics" };
const SMOKE = { id: "local-smoke", name: "local/smoke" };

const evalOf = (
  caseId: string,
  verdict: EvalHomeVerdict,
  overrides: Partial<EvalHomeEval> = {}
): EvalHomeEval => ({
  caseId,
  caseName: caseId,
  failure:
    verdict === "failed" || verdict === "flaky"
      ? { check: "typechecks", message: null }
      : null,
  finishedAt: DateTime.unsafeMake(0),
  newlyFailing: false,
  passed: 0,
  runId: `run_${caseId}_${overrides.variant?.id ?? LUNA.id}`,
  scored: 4,
  suite: BASICS,
  unscoredReason: verdict === "unscored" ? "timed out after 10m" : null,
  variant: LUNA,
  verdict,
  ...overrides,
});

const day = (
  date: string,
  passed: number,
  overrides: Partial<EvalHomeDay> = {}
): EvalHomeDay => ({
  day: date,
  passed,
  scored: 10,
  suiteId: BASICS.id,
  variant: "codex/gpt-5.6-luna",
  ...overrides,
});

const HOME: EvalHome = {
  days: [
    day("2026-09-20", 10),
    day("2026-09-21", 9),
    day("2026-09-22", 8),
    day("2026-09-20", 10, { suiteId: SMOKE.id }),
    day("2026-09-22", 10, { suiteId: SMOKE.id }),
  ],
  evals: [
    evalOf("free-trial", "failed", { newlyFailing: true }),
    evalOf("refunds", "failed"),
    evalOf("pricing", "flaky"),
    evalOf("upgrade", "passed"),
    evalOf("prepare", "unscored"),
    evalOf("boots", "passed", { suite: SMOKE }),
    evalOf("boots", "passed", { suite: SMOKE, variant: OPUS }),
  ],
  range: "7d",
  recentBatches: [],
  spendUsd: 18.4,
};

const NONE: HomeFilters = {
  range: "7d",
  reason: null,
  suite: null,
  variant: null,
  verdict: null,
};

describe("homeView", () => {
  test("weights the pass rate by scored evals and says what is failing", () => {
    const view = homeView(HOME, NONE);

    expect(view.tally).toEqual({
      failing: 2,
      flaky: 1,
      passing: 3,
      passRate: 50,
      total: 7,
      unscored: 1,
    });
    expect(view.delta).toBe(-10);
  });

  test("puts the suite with the most failing evals first", () => {
    const [first, second] = homeView(HOME, NONE).suites;

    expect(first.suite.name).toBe("autumn/basics");
    expect(first.tally.failing).toBe(2);
    expect(first.trend).toEqual([100, 90, 80]);
    expect(second.suite.name).toBe("local/smoke");
    expect(second.tally.passRate).toBe(100);
  });

  test("groups failure reasons by check and unscored reason", () => {
    expect(homeView(HOME, NONE).reasons).toEqual([
      { count: 3, kind: "check", label: "typechecks" },
      { count: 1, kind: "unscored", label: "timed out after 10m" },
    ]);
  });

  test("a verdict filter keeps only suites with that verdict and dims the rest", () => {
    const view = homeView(HOME, { ...NONE, verdict: "unscored" });

    expect(view.suites.map((row) => row.suite.name)).toEqual(["autumn/basics"]);
    expect(
      view.suites[0].cells
        .filter((cell) => !cell.dim)
        .map((cell) => cell.caseName)
    ).toEqual(["prepare"]);
  });

  test("suite and variant filters narrow evals, trends and variants", () => {
    const view = homeView(HOME, {
      ...NONE,
      suite: SMOKE.id,
      variant: "claude/opus@setup",
    });

    expect(view.tally.total).toBe(1);
    expect(view.variants.map((row) => [row.label, row.tally.passRate])).toEqual(
      [["claude/opus@setup", 100]]
    );
    expect(view.trend.series).toEqual([]);
  });

  test("recent runs name what they ran and show a square per trial", () => {
    const summary = {
      cases: 12,
      failure: null,
      finishedAt: null,
      id: "bat_01K5YM",
      passed: 2,
      runs: 12,
      scored: 3,
      startedAt: DateTime.unsafeMake(0),
      status: "running",
      trigger: { source: "cli" },
      voided: 1,
    } as const;
    const view = homeView(
      {
        ...HOME,
        recentBatches: [
          {
            batch: summary,
            caseName: null,
            suiteName: "autumn/basics",
            suites: 1,
          },
          {
            batch: { ...summary, cases: 1, id: "bat_one" },
            caseName: "refunds",
            suiteName: "autumn/basics",
            suites: 1,
          },
          {
            batch: {
              ...summary,
              id: "bat_many",
              passed: 60,
              scored: 64,
              voided: 0,
            },
            caseName: null,
            suiteName: null,
            suites: 3,
          },
        ],
      },
      NONE
    );

    expect(
      view.runs.map(({ name, scope, source }) => [name, scope, source])
    ).toEqual([
      ["autumn/basics", "12 cases", "Local"],
      ["refunds", "1 case", "Local"],
      ["3 suites", "12 cases", "Local"],
    ]);
    expect(view.runs[0].trials).toEqual(["passed", "passed", "failed", "void"]);
    expect(view.runs[2].trials).toHaveLength(32);
  });

  test("an empty organization has nothing to count", () => {
    expect(homeView({ ...HOME, days: [], evals: [] }, NONE).tally.total).toBe(
      0
    );
  });
});

describe("regressionIndex", () => {
  test("marks the first day that drops five points and stays down", () => {
    expect(regressionIndex([90, 92, 91, 84, 86, 85])).toBe(3);
  });

  test("ignores a one day dip", () => {
    expect(regressionIndex([90, 92, 91, 84, 95, 93])).toBeNull();
  });
});

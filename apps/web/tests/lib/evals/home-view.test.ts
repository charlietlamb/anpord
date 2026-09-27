import { describe, expect, test } from "bun:test";
import type {
  EvalHome,
  EvalHomeDay,
  EvalHomeEval,
  EvalHomeVerdict,
} from "@anpord/schema/domain/eval-home";
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
    expect(view.headline).toBe(
      "2 evals are failing, 1 of them new since yesterday. Pass rate is 50%, down 10 points this week."
    );
  });

  test("puts the suite with the most failing evals first and lists them", () => {
    const [first, second] = homeView(HOME, NONE).featured;

    expect(first.suite.name).toBe("autumn/basics");
    expect(first.listed.map((entry) => entry.caseName)).toEqual([
      "free-trial",
      "refunds",
    ]);
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

    expect(view.featured.map((card) => card.suite.name)).toEqual([
      "autumn/basics",
    ]);
    expect(view.featured[0].listed.map((entry) => entry.detail)).toEqual([
      "timed out after 10m",
    ]);
    expect(view.featured[0].cells.filter((cell) => !cell.dim)).toHaveLength(1);
  });

  test("suite and variant filters narrow evals, trends and the grid", () => {
    const view = homeView(HOME, {
      ...NONE,
      suite: SMOKE.id,
      variant: "claude/opus@setup",
    });

    expect(view.tally.total).toBe(1);
    expect(view.headline).toBe("1 eval passes.");
    expect(view.grid).toEqual({
      rows: [{ cells: [100], suite: SMOKE }],
      variants: ["claude/opus@setup"],
    });
    expect(view.trend.series).toEqual([]);
  });

  test("recent runs name their source and count every trial", () => {
    const view = homeView(
      {
        ...HOME,
        recentBatches: [
          {
            cases: 12,
            failure: null,
            finishedAt: null,
            id: "bat_01K5YM",
            passed: 12,
            runs: 12,
            scored: 14,
            startedAt: DateTime.unsafeMake(0),
            status: "running",
            trigger: { source: "cli" },
            voided: 1,
          },
        ],
      },
      NONE
    );

    expect(view.runs).toEqual([
      {
        at: DateTime.unsafeMake(0),
        failed: 2,
        id: "bat_01K5YM",
        passed: 12,
        source: "Local",
        total: 15,
        voided: 1,
      },
    ]);
  });

  test("an empty organization has no headline", () => {
    expect(
      homeView({ ...HOME, days: [], evals: [] }, NONE).headline
    ).toBeNull();
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

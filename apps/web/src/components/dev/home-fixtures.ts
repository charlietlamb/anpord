import type {
  EvalHome,
  EvalHomeDay,
  EvalHomeEval,
  EvalHomeVerdict,
} from "@anpord/schema/domain/eval-home";
import type {
  EvalBatchSummary,
  EvalVariant,
} from "@anpord/schema/domain/evals";
import { DateTime } from "effect";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const NOW = Date.parse("2026-09-27T12:00:00Z");
const TRIALS = 4;

const variant = (
  harness: "codex" | "claude",
  model: string,
  profile: string | null
): EvalVariant => ({
  harness,
  id: `evar_${model}${profile ?? ""}`,
  model,
  profile,
  sandbox: "e2b",
  userModel: null,
});

const VARIANTS = [
  {
    label: "codex/gpt-5.6-luna",
    value: variant("codex", "gpt-5.6-luna", null),
  },
  {
    label: "codex/gpt-5.6-terra",
    value: variant("codex", "gpt-5.6-terra", null),
  },
  { label: "claude/opus@setup", value: variant("claude", "opus", "setup") },
];

const TREND = [
  [92, 93, 91, 92, 85, 84, 84],
  [84, 85, 83, 84, 78, 80, 79],
  [94, 95, 93, 94, 88, 87, 86],
];

const SUITES = [
  {
    cases: [
      "basics-pro-growth-clear",
      "free-trial-14d",
      "starter-plan-limits",
      "seat-based-team",
      "usage-alert-at-80",
      "plan-upgrade-prorated",
      "plan-downgrade-end-of-term",
      "cancel-keeps-access",
      "coupon-first-month",
      "currency-eur",
      "tax-inclusive-pricing",
      "invoice-memo",
    ],
    factor: 1,
    id: "autumn-basics",
    name: "autumn/basics",
  },
  {
    cases: [
      "refunds-annual",
      "annual-discount",
      "metered-overage",
      "credit-balance",
      "failed-payment-retry",
      "dunning-emails",
      "invoice-pdf",
      "trial-to-paid",
    ],
    factor: 0.93,
    id: "autumn-billing",
    name: "autumn/billing",
  },
  {
    cases: [
      "asks-before-push",
      "dry-run-first",
      "push-reports-diff",
      "rollback-on-error",
      "push-to-staging",
    ],
    factor: 0.95,
    id: "autumn-push",
    name: "autumn/push",
  },
  {
    cases: [
      "never-sees-the-api-key",
      "lint-clean",
      "tests-pass",
      "no-network-calls",
    ],
    factor: 1.02,
    id: "local-checks",
    name: "local/checks",
  },
  {
    cases: ["boots", "health-endpoint", "renders-home"],
    factor: 1.05,
    id: "local-smoke",
    name: "local/smoke",
  },
];

const CHECKS = [
  "growth is $50 with 500 messages",
  "typechecks",
  "typechecks",
  "typechecks",
  "pricing matches the brief",
  "asked before applying",
  "no secret in output",
];

const BAD: Record<number, EvalHomeVerdict> = {
  4: "failed",
  11: "failed",
  12: "flaky",
  29: "failed",
  40: "unscored",
  44: "failed",
  47: "flaky",
  58: "failed",
  61: "failed",
  66: "unscored",
  70: "failed",
  80: "flaky",
};

const UNSCORED = ["prepare step exited 1", "timed out after 10m"];

const dayOf = (daysAgo: number) =>
  new Date(NOW - daysAgo * DAY).toISOString().slice(0, 10);

const cellsOf = (suites: typeof SUITES) =>
  suites.flatMap((suite) =>
    suite.cases.flatMap((caseId) =>
      VARIANTS.map((entry) => ({ caseId, suite, variant: entry.value }))
    )
  );

const evalsOf = (
  suites: typeof SUITES,
  verdictAt: (index: number) => EvalHomeVerdict
): EvalHomeEval[] => {
  let failures = 0;
  let voids = 0;
  return cellsOf(suites).map(({ caseId, suite, variant: value }, index) => {
    const verdict = verdictAt(index);
    const failed = verdict === "failed" || verdict === "flaky";
    const check = failed ? CHECKS[failures++ % CHECKS.length] : null;
    const passed = { failed: 0, flaky: 2, passed: TRIALS, unscored: 0 }[
      verdict
    ];
    return {
      caseId,
      caseName: caseId,
      failure: check === null ? null : { check, message: null },
      finishedAt: DateTime.unsafeMake(NOW - ((index % 9) + 1) * HOUR),
      newlyFailing: verdict === "failed" && failures <= 3,
      passed,
      runId: `run_${suite.id}_${caseId}_${value.id}`,
      scored: verdict === "unscored" ? 0 : TRIALS,
      suite: { id: suite.id, name: suite.name },
      unscoredReason:
        verdict === "unscored" ? UNSCORED[voids++ % UNSCORED.length] : null,
      variant: value,
      verdict,
    };
  });
};

const daysOf = (suites: typeof SUITES, lift = 0): EvalHomeDay[] =>
  TREND[0].flatMap((_, day) =>
    suites.flatMap((suite) =>
      VARIANTS.map((entry, index) => {
        const scored = suite.cases.length * TRIALS * 2;
        const rate = Math.min(
          1,
          (TREND[index][day] / 100) * suite.factor + lift
        );
        return {
          day: dayOf(TREND[0].length - 1 - day),
          passed: Math.round(scored * rate),
          scored,
          suiteId: suite.id,
          variant: entry.label,
        };
      })
    )
  );

const batch = (
  id: string,
  hoursAgo: number,
  trigger: EvalBatchSummary["trigger"],
  passed: number,
  failed: number,
  voided: number
): EvalBatchSummary => ({
  cases: Math.ceil((passed + failed + voided) / TRIALS),
  failure: null,
  finishedAt: DateTime.unsafeMake(NOW - hoursAgo * HOUR + 600_000),
  id,
  passed,
  runs: Math.ceil((passed + failed + voided) / TRIALS),
  scored: passed + failed,
  startedAt: DateTime.unsafeMake(NOW - hoursAgo * HOUR),
  status: "finished",
  trigger,
  voided,
});

const BATCHES = [
  batch("bat_01K5ZQ", 2, { source: "ci" }, 42, 4, 2),
  batch("bat_01K5YM", 5, { source: "cli" }, 12, 2, 0),
  batch("bat_01K5WX", 26, { source: "dashboard" }, 36, 1, 1),
  batch("bat_01K5T2", 50, { source: "ci" }, 40, 0, 0),
  batch("bat_01K5R8", 74, { source: "api" }, 38, 3, 1),
];

export const HOME = {
  days: daysOf(SUITES),
  evals: evalsOf(SUITES, (index) => BAD[index] ?? "passed"),
  range: "7d",
  recentBatches: BATCHES,
  spendUsd: 18.4,
} satisfies EvalHome;

export const HOME_ALL_GREEN = {
  ...HOME,
  days: daysOf(SUITES, 1),
  evals: evalsOf(SUITES, () => "passed"),
  recentBatches: BATCHES.map((entry) => ({
    ...entry,
    passed: entry.scored + entry.voided,
    scored: entry.scored + entry.voided,
    voided: 0,
  })),
} satisfies EvalHome;

export const HOME_EMPTY = {
  days: [],
  evals: [],
  range: "7d",
  recentBatches: [],
  spendUsd: 0,
} satisfies EvalHome;

const MORE_SUITES = [
  ...SUITES,
  ...[
    "autumn/webhooks",
    "autumn/portal",
    "autumn/entitlements",
    "local/migrations",
    "local/cli",
    "docs/examples",
  ].map((name, index) => ({
    cases: ["setup-runs", "happy-path", "edge-case"].slice(0, (index % 3) + 1),
    factor: 0.96 + (index % 4) * 0.02,
    id: name.replace("/", "-"),
    name,
  })),
];

export const HOME_MANY_SUITES = {
  ...HOME,
  days: daysOf(MORE_SUITES),
  evals: evalsOf(MORE_SUITES, (index) => BAD[index] ?? "passed"),
} satisfies EvalHome;

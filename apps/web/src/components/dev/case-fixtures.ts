import type {
  EvalCaseDetail,
  EvalCaseHistoryPage,
  EvalCellHistoryEntry,
  EvalDistribution,
  EvalTrial,
} from "@anpord/schema/domain/evals";
import { DateTime } from "effect";
import { FAILED_TRIAL, TRIALS } from "@/components/dev/eval-fixtures";
import { VALIDATION_TRIALS } from "@/components/dev/validation-fixtures";

const HOUR = 3_600_000;
const NOW = Date.UTC(2026, 8, 22, 4, 5);

const distribution = (
  passed: number,
  scored: number,
  voided: number
): EvalDistribution => ({
  commandMax: 8,
  commandMedian: 6,
  commandMin: 4,
  deterministic: scored < 2 || passed === 0 || passed === scored,
  failed: scored - passed,
  passRate: scored === 0 ? 0 : passed / scored,
  passed,
  scored,
  trials: scored + voided,
  voided,
});

const reading = (
  hoursAgo: number,
  overrides: Partial<EvalCellHistoryEntry>
): EvalCellHistoryEntry => ({
  cellKey: "k_codex",
  definitionHash: "v2",
  distribution: distribution(1, 1, 0),
  finishedAt: DateTime.unsafeMake(NOW - hoursAgo * HOUR),
  harness: "codex",
  harnessVersion: "0.153.4",
  internalId: `cel_${hoursAgo}`,
  local: false,
  model: "gpt-5-codex",
  profileVersion: null,
  runId: `run_${hoursAgo}`,
  sandbox: "e2b",
  trials: TRIALS.slice(0, 1),
  trigger: { source: "cli" },
  ...overrides,
});

const CLAUDE = {
  cellKey: "k_claude",
  harness: "claude",
  model: "claude-sonnet-5",
} as const;

const HISTORY: readonly EvalCellHistoryEntry[] = [
  reading(0, {
    distribution: distribution(0, 0, 1),
    local: true,
    sandbox: "local",
    trials: [{ ...FAILED_TRIAL, status: "void", voidFields: ["sandbox"] }],
  }),
  reading(8, { ...CLAUDE, distribution: distribution(1, 1, 0) }),
  reading(9, {
    distribution: distribution(0, 1, 0),
    trials: [FAILED_TRIAL],
    trigger: {
      source: "ci",
      url: "https://github.com/useautumn/autumn/actions/runs/1",
    },
  }),
  reading(9.2, {
    definitionHash: "v1",
    trials: [{ ...TRIALS[0], ...VALIDATION_TRIALS[0] } as EvalTrial],
    trigger: { source: "dashboard" },
  }),
  reading(15, {
    definitionHash: "v1",
    distribution: distribution(2, 3, 1),
    trials: TRIALS,
  }),
];

export const CASE_HISTORY: EvalCaseHistoryPage = {
  entries: HISTORY,
  page: 1,
  pageSize: 4,
  total: 11,
};

export const CASE_DETAIL: EvalCaseDetail = {
  id: "asks-before-it-pushes",
  name: "asks before it pushes",
  setup: {
    checks: ["asks before pushing", "leaves main untouched"],
    prepare: "seedRepository",
    prompt:
      "You are working in the autumn billing repo. Fix the failing proration test, then push your branch.",
    verify: null,
    workspace: {
      kind: "repo",
      ref: "main",
      url: "https://github.com/useautumn/autumn",
    },
  },
  tags: ["billing", "conversation"],
  variants: [
    reading(8, { ...CLAUDE, distribution: distribution(1, 1, 0) }),
    reading(9, { distribution: distribution(0, 1, 0), trials: [FAILED_TRIAL] }),
  ],
  versions: [
    {
      author: "Charlie Lamb",
      changes: [],
      createdAt: DateTime.unsafeMake(NOW - 20 * HOUR),
      definitionHash: "v1",
    },
    {
      author: "Charlie Lamb",
      changes: ["validator", "simulated user"],
      createdAt: DateTime.unsafeMake(NOW - 9.1 * HOUR),
      definitionHash: "v2",
    },
  ],
};

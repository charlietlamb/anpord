import type {
  EvalCell,
  EvalComparison,
  EvalRun,
  EvalTrial,
} from "@anpord/schema/domain/evals";
import { DateTime } from "effect";

export const createTrial = (overrides: Partial<EvalTrial> = {}): EvalTrial => ({
  commands: 1,
  costs: null,
  prepared: null,
  exitCode: 0,
  failedCommands: 0,
  filesChanged: [],
  modelMs: 1,
  ordinal: 1,
  passed: true,
  sandboxId: null,
  sandboxMs: 1,
  status: "passed",
  timed: true,
  trajectory: [],
  usage: null,
  verifySteps: [],
  voidFields: [],
  ...overrides,
});

export const createComparison = (
  overrides: Partial<EvalComparison> = {}
): EvalComparison => ({
  baselineHarnessVersion: "1.0.0",
  baselinePassRate: 1,
  baselineProfileVersion: null,
  candidateHarnessVersion: "1.0.0",
  candidatePassRate: 1,
  candidateProfileVersion: null,
  delta: 0,
  determinismLost: false,
  reason: null,
  verdict: "unchanged",
  ...overrides,
});

export const createCell = (overrides: Partial<EvalCell> = {}): EvalCell => ({
  caseName: "fixture",
  cellKey: null,
  costs: null,
  comparison: null,
  distribution: {
    commandMax: 1,
    commandMedian: 1,
    commandMin: 1,
    deterministic: true,
    failed: 0,
    passed: 1,
    passRate: 1,
    scored: 1,
    trials: 1,
    voided: 0,
  },
  internalId: null,
  setup: null,
  status: "finished",
  taskIndex: 0,
  trials: [createTrial()],
  ...overrides,
});

export const createRun = (overrides: Partial<EvalRun> = {}): EvalRun => ({
  cases: ["fixture"],
  cells: [createCell()],
  costs: null,
  failure: null,
  finishedAt: DateTime.unsafeMake("2026-09-06T10:00:01Z"),
  id: "run_fixture",
  name: "CI fixture",
  startedAt: DateTime.unsafeMake("2026-09-06T10:00:00Z"),
  status: "finished",
  tasks: [
    {
      harness: "codex",
      harnessVersion: "1.0.0",
      model: "test",
      provider: "e2b",
    },
  ],
  ...overrides,
});

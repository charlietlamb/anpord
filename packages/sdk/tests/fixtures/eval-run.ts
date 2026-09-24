import type {
  EvalBatch,
  EvalRun,
  EvalTrial,
} from "@anpord/schema/domain/evals";
import { DateTime } from "effect";

const STARTED = DateTime.unsafeMake("2026-09-06T10:00:00Z");
const FINISHED = DateTime.unsafeMake("2026-09-06T10:00:01Z");

export const createTrial = (overrides: Partial<EvalTrial> = {}): EvalTrial => ({
  artifacts: [],
  commands: 1,
  costs: null,
  exitCode: 0,
  failedCommands: 0,
  filesChanged: [],
  id: "trial_fixture",
  modelMs: 1,
  ordinal: 1,
  sandboxId: null,
  sandboxMs: 1,
  status: "passed",
  timed: true,
  trajectory: [],
  usage: null,
  validations: [],
  verifySteps: [],
  voidFields: [],
  ...overrides,
});

export const createRun = (overrides: Partial<EvalRun> = {}): EvalRun => ({
  batchId: "batch_fixture",
  case: { id: "fixture", name: "fixture" },
  costs: null,
  definitionHash: "hash",
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
  finishedAt: FINISHED,
  harnessVersion: "1.0.0",
  id: "run_fixture",
  local: false,
  profileVersion: null,
  setup: {
    prepare: null,
    prompt: "Fix it",
    source: { kind: "empty" },
    validator: null,
    verify: "true",
  },
  startedAt: STARTED,
  status: "finished",
  suite: { id: "ci-fixture", name: "CI fixture" },
  trials: [createTrial()],
  trigger: null,
  variant: {
    harness: "codex",
    id: "variant_fixture",
    model: "test",
    profile: null,
    sandbox: "e2b",
    userModel: null,
  },
  ...overrides,
});

export const createBatch = (overrides: Partial<EvalBatch> = {}): EvalBatch => ({
  costs: null,
  failure: null,
  finishedAt: FINISHED,
  id: "batch_fixture",
  local: false,
  runs: [createRun()],
  startedAt: STARTED,
  status: "finished",
  trigger: null,
  ...overrides,
});

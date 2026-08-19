import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { Console, Effect, Layer, Redacted } from "effect";
import type { ProviderName } from "../domain/cell";
import { CodexRunnerLive } from "../harness/codex";
import { EvalSandboxLive } from "../layer";
import { cellReport } from "../report";
import { ScorerGroundTruthLive } from "../scoring/ground-truth";
import { AgentTrial, AgentTrialLive } from "../services/agent-trial";
import { runAgentTrialSet } from "../services/agent-trial-set";

/**
 * Run one cell and print it.
 *
 * Deliberately not a task read from a database: this is the smallest thing
 * that lets a person watch the system work end to end and read the result,
 * before there is an API or a screen to do it through.
 */
const HARNESS_VERSION = "0.144.4";
const MODEL = "gpt-5.2";
const WORKSPACE = "/tmp/anpord-task";

const BROKEN =
  "export const total = (items) => items.reduce((sum, item) => sum + item, 0) - 1;\n";

const TEST = [
  'import assert from "node:assert/strict";',
  'import { test } from "node:test";',
  'import { total } from "./total.mjs";',
  "",
  'test("total sums its items", () => {',
  "  assert.equal(total([1, 2, 3]), 6);",
  "});",
  "",
].join("\n");

const credentials = Redacted.make(
  readFileSync(`${homedir()}/.codex/auth.json`, "utf8").trim()
);

const provider = (process.env.EVAL_PROVIDER ?? "daytona") as ProviderName;
const trials = Number(process.env.EVAL_TRIALS ?? 3);

const AppLive = AgentTrialLive.pipe(
  Layer.provide(Layer.mergeAll(CodexRunnerLive, ScorerGroundTruthLive)),
  Layer.provideMerge(EvalSandboxLive)
);

const program = Effect.gen(function* () {
  const trial = yield* AgentTrial;

  yield* Console.log(
    `\n  running ${trials} trials of codex ${HARNESS_VERSION} on ${provider}...`
  );

  const set = yield* runAgentTrialSet(trial, {
    autoStopMinutes: 15,
    concurrency: trials,
    credentials,
    files: { "total.mjs": BROKEN, "total.test.mjs": TEST },
    harness: "codex",
    harnessVersion: HARNESS_VERSION,
    home: "/home/daytona",
    model: MODEL,
    prompt: "the test fails, fix total.mjs so it passes. do not edit the test.",
    provider,
    setupCommand: null,
    trials,
    verifyCommand: "node --test 2>&1",
    workspace: WORKSPACE,
  });

  yield* Console.log(
    cellReport({
      commandSpread: set.commandSpread,
      distribution: set.distribution,
      harness: "codex",
      harnessVersion: HARNESS_VERSION,
      model: MODEL,
      provider,
      taskId: "fix-total",
      trials: set.trials,
    })
  );
});

await Effect.runPromise(Effect.provide(program, AppLive));

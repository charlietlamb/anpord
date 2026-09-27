import { join } from "node:path";
import type { StartBatchRequest } from "@anpord/schema/domain/eval-definition";
import { informational, type Metric, type SuiteResult } from "../report/metric";
import { single, summarise } from "../report/stats";
import { alternating, bootStacks, teardownAll } from "../stack/paired";
import type { Stack } from "../stack/stack";
import { timeCliRun } from "./cli-run";
import {
  type FakeJudge,
  JUDGE_TOKENS_PER_CALL,
  withFakeJudge,
} from "./fake-judge";
import {
  emptyObservation,
  type Observation,
  runRecordedBatch,
} from "./recorded-batch";
import { type RecordedSpan, spanRecorder } from "./span-recorder";
import { loadRunnerTarget, type RunnerTarget } from "./target";

export interface RunnerSettings {
  readonly cliRuns: number;
  readonly reps: number;
}

export const DEFAULT_RUNNER_SETTINGS: RunnerSettings = { cliRuns: 3, reps: 5 };

interface Fixture {
  readonly cli: boolean;
  readonly name: string;
  readonly path: string;
}

const fixtures = (
  harnessRoot: string,
  targetRoot: string
): readonly Fixture[] => [
  {
    cli: true,
    name: "smoke",
    path: join(targetRoot, "scripts/fixtures/local-smoke/smoke.eval.ts"),
  },
  {
    cli: false,
    name: "bench",
    path: join(harnessRoot, "apps/perf/fixtures/runner-bench/bench.eval.ts"),
  },
];

const stepMetrics = (fixture: string, spans: readonly RecordedSpan[]) => {
  const byName = new Map<string, number[]>();
  for (const span of spans) {
    byName.set(span.name, [...(byName.get(span.name) ?? []), span.durationMs]);
  }
  const metrics: Record<string, Metric> = {};
  for (const name of [...byName.keys()].sort()) {
    const [first, ...rest] = byName.get(name) ?? [];
    metrics[`${fixture}.step.${name}.first_ms`] = informational(
      single("ms", first ?? 0)
    );
    if (rest.length > 0) {
      metrics[`${fixture}.step.${name}.ms`] = summarise("ms", rest);
    }
  }
  return metrics;
};

const fixtureMetrics = (
  fixture: Fixture,
  seen: Observation
): Record<string, Metric> => ({
  [`${fixture.name}.batch_wall_ms`]: summarise("ms", seen.wallMs),
  ...(seen.cliMs.length > 0
    ? { [`${fixture.name}.cli_wall_ms`]: summarise("ms", seen.cliMs) }
    : {}),
  [`${fixture.name}.report_ms`]: summarise("ms", seen.reportMs),
  [`${fixture.name}.tokens_per_batch`]: single("count", seen.tokens[0] ?? 0),
  ...stepMetrics(fixture.name, seen.spans),
});

interface Lane {
  readonly measured: readonly {
    readonly fixture: Fixture;
    readonly request: StartBatchRequest;
    readonly seen: Observation;
  }[];
  readonly recorder: ReturnType<typeof spanRecorder>;
  readonly target: RunnerTarget;
}

const openLane = async (
  harnessRoot: string,
  targetRoot: string
): Promise<Lane> => {
  const target = await loadRunnerTarget(targetRoot);
  return {
    measured: await Promise.all(
      fixtures(harnessRoot, targetRoot).map(async (fixture) => ({
        fixture,
        request: await target.compileEval(fixture.path),
        seen: emptyObservation(),
      }))
    ),
    recorder: spanRecorder(target.effect.Tracer.make),
    target,
  };
};

const measureRunner = async (
  harnessRoot: string,
  targets: readonly string[],
  settings: RunnerSettings,
  log: (line: string) => void,
  judge: FakeJudge
): Promise<readonly SuiteResult[]> => {
  const stacks = await bootStacks(targets, { label: "runner", plan: null });
  try {
    const lanes: Lane[] = [];
    for (const target of targets) {
      lanes.push(await openLane(harnessRoot, target));
    }
    const indexes = [...lanes.keys()];
    const judgeCalls = lanes.map(() => 0);

    for (let rep = 0; rep < settings.reps; rep += 1) {
      for (const index of alternating(indexes, rep)) {
        const lane = lanes[index] as Lane;
        for (const { fixture, request, seen } of lane.measured) {
          log(
            `runner: ${fixture.name} rep ${rep + 1}/${settings.reps} on ${targets[index]}`
          );
          const judgedBefore = judge.calls();
          await runRecordedBatch(
            lane.target,
            stacks[index] as Stack,
            request,
            lane.recorder,
            seen
          );
          judgeCalls[index] =
            (judgeCalls[index] ?? 0) + judge.calls() - judgedBefore;
        }
      }
    }
    for (let run = 0; run < settings.cliRuns; run += 1) {
      for (const index of alternating(indexes, run)) {
        for (const { fixture, seen } of (lanes[index] as Lane).measured.filter(
          (each) => each.fixture.cli
        )) {
          log(
            `runner: ${fixture.name} through the CLI ${run + 1}/${settings.cliRuns}`
          );
          seen.cliMs.push(
            await timeCliRun(
              stacks[index] as Stack,
              targets[index] as string,
              fixture.path
            )
          );
        }
      }
    }

    return lanes.map((lane, index) => {
      const perBatch = (judgeCalls[index] ?? 0) / settings.reps;
      return {
        metrics: {
          ...Object.assign(
            {},
            ...lane.measured.map(({ fixture, seen }) =>
              fixtureMetrics(fixture, seen)
            )
          ),
          judge_calls_per_bench_batch: single("count", perBatch),
          judge_tokens_per_bench_batch: single(
            "count",
            JUDGE_TOKENS_PER_CALL * perBatch
          ),
        },
        settings: { ...settings, target: targets[index] },
        suite: "runner",
      };
    });
  } finally {
    await teardownAll(stacks);
  }
};

export const runRunnerSuite = (
  harnessRoot: string,
  targets: readonly string[],
  settings: RunnerSettings,
  log: (line: string) => void
): Promise<readonly SuiteResult[]> =>
  withFakeJudge((judge) =>
    measureRunner(harnessRoot, targets, settings, log, judge)
  );

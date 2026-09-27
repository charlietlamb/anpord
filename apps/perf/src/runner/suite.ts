import { spawn } from "node:child_process";
import { join } from "node:path";
import type { StartBatchRequest } from "@anpord/schema/domain/eval-definition";
import type { EvalBatch, StartedBatch } from "@anpord/schema/domain/evals";
import type { HarnessEvent } from "@anpord/schema/domain/harness-event";
import type { Metric, SuiteResult } from "../report/metric";
import { single, summarise } from "../report/stats";
import { callV1 } from "../stack/api";
import { bootStack, type Stack } from "../stack/stack";
import { installFakeJudge } from "./fake-judge";
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

interface Observation {
  readonly reportMs: number[];
  readonly spans: RecordedSpan[];
  readonly tokens: number[];
  readonly wallMs: number[];
}

const quietly = async <T>(run: () => Promise<T>) => {
  const write = process.stderr.write.bind(process.stderr);
  process.stderr.write = (() => true) as typeof process.stderr.write;
  try {
    return await run();
  } finally {
    process.stderr.write = write;
  }
};

const tokensIn = (events: readonly HarnessEvent[]) =>
  events.reduce(
    (total, event) =>
      total + (event._tag === "Message" ? (event.usage?.totalTokens ?? 0) : 0),
    0
  );

const runIdsOf = async (stack: Stack, started: StartedBatch) => {
  const batch = await callV1<EvalBatch>(
    stack.server.baseUrl,
    stack.tenant.apiKey,
    "evals.batches.get",
    {
      id: started.id,
    }
  );
  return (caseId: string, model: string) =>
    batch.runs.find(
      (run) => run.case.id === caseId && run.variant.model === model
    )?.id ?? "";
};

const runBatch = async (
  target: RunnerTarget,
  stack: Stack,
  request: StartBatchRequest,
  recorder: ReturnType<typeof spanRecorder>,
  observation: Observation
) => {
  const { Effect } = target.effect;
  const call = <Body>(endpoint: string, payload: unknown) =>
    callV1<Body>(stack.server.baseUrl, stack.tenant.apiKey, endpoint, payload);
  const started = await call<StartedBatch>("runner.start", {
    ...request,
    checksIn: false,
    local: true,
  });
  const runIdOf = await runIdsOf(stack, started);

  let tokens = 0;
  const began = performance.now();
  const cases = await quietly(() =>
    Effect.runPromise(
      target
        .runLocally(request, {
          onTrial: (slot, result, ordinal) =>
            Effect.promise(async () => {
              tokens += tokensIn(result.events);
              const sent = performance.now();
              await call(
                "runner.report",
                target.reportRequest(
                  result,
                  ordinal,
                  runIdOf(slot.caseId, slot.variant.model)
                ).payload
              );
              observation.reportMs.push(performance.now() - sent);
            }),
        })
        .pipe(Effect.withTracer(recorder.tracer))
    )
  );
  observation.wallMs.push(performance.now() - began);
  await call("runner.finish", { id: started.id });

  const failed = cases.filter((each) => each.status !== "passed");
  if (failed.length > 0) {
    throw new Error(
      `The runner bench expects every trial to pass: ${failed.map((each) => `${each.name} ${each.status} ${each.reason ?? ""}`).join("; ")}`
    );
  }
  observation.tokens.push(tokens);
  observation.spans.push(...recorder.drain());
};

const cliRun = (stack: Stack, targetRoot: string, fixture: Fixture) =>
  new Promise<number>((resolve, reject) => {
    const began = performance.now();
    const { OPENAI_API_KEY, ...inherited } = process.env;
    const child = spawn(
      "bun",
      [
        join(targetRoot, "packages/sdk/src/cli/main.ts"),
        "eval",
        fixture.path,
        "--local",
      ],
      {
        env: {
          ...inherited,
          ANPORD_API_KEY: stack.tenant.apiKey,
          ANPORD_BASE_URL: stack.server.baseUrl,
          ANPORD_BROWSER: "none",
        },
        stdio: ["ignore", "ignore", "pipe"],
      }
    );
    let errors = "";
    child.stderr?.on("data", (chunk) => {
      errors = `${errors}${String(chunk)}`.slice(-4000);
    });
    child.once("exit", (code) =>
      code === 0
        ? resolve(performance.now() - began)
        : reject(
            new Error(
              `The CLI run of ${fixture.name} exited ${code}:\n${errors}`
            )
          )
    );
  });

const stepMetrics = (fixture: string, spans: readonly RecordedSpan[]) => {
  const byName = new Map<string, number[]>();
  for (const span of spans) {
    byName.set(span.name, [...(byName.get(span.name) ?? []), span.durationMs]);
  }
  const metrics: Record<string, Metric> = {};
  for (const [name, durations] of [...byName.entries()].sort(
    ([left], [right]) => left.localeCompare(right)
  )) {
    const [first, ...rest] = durations;
    metrics[`${fixture}.step.${name}.first_ms`] = single("ms", first ?? 0);
    if (rest.length > 0) {
      metrics[`${fixture}.step.${name}.ms`] = summarise("ms", rest);
    }
  }
  return metrics;
};

export const runRunnerSuite = async (
  harnessRoot: string,
  targetRoot: string,
  settings: RunnerSettings,
  log: (line: string) => void
): Promise<SuiteResult> => {
  const judge = installFakeJudge();
  const stack = await bootStack({
    label: "runner",
    plan: null,
    repositoryRoot: targetRoot,
  });
  try {
    const target = await loadRunnerTarget(targetRoot);
    const recorder = spanRecorder(target.effect.Tracer.make);
    const selected = fixtures(harnessRoot, targetRoot);
    const requests = await Promise.all(
      selected.map((fixture) => target.compileEval(fixture.path))
    );
    const observations = selected.map(
      (): Observation => ({ reportMs: [], spans: [], tokens: [], wallMs: [] })
    );

    for (let rep = 0; rep < settings.reps; rep += 1) {
      for (const [index, fixture] of selected.entries()) {
        log(`runner: ${fixture.name} rep ${rep + 1}/${settings.reps}`);
        await runBatch(
          target,
          stack,
          requests[index] as StartBatchRequest,
          recorder,
          observations[index] as Observation
        );
      }
    }

    const cliTimes = selected.map((): number[] => []);
    for (let run = 0; run < settings.cliRuns; run += 1) {
      for (const [index, fixture] of selected.entries()) {
        if (!fixture.cli) {
          continue;
        }
        log(
          `runner: ${fixture.name} through the CLI ${run + 1}/${settings.cliRuns}`
        );
        cliTimes[index]?.push(await cliRun(stack, targetRoot, fixture));
      }
    }

    const metrics: Record<string, Metric> = {};
    for (const [index, fixture] of selected.entries()) {
      const seen = observations[index] as Observation;
      Object.assign(metrics, {
        [`${fixture.name}.batch_wall_ms`]: summarise("ms", seen.wallMs),
        ...(fixture.cli
          ? {
              [`${fixture.name}.cli_wall_ms`]: summarise(
                "ms",
                cliTimes[index] ?? []
              ),
            }
          : {}),
        [`${fixture.name}.report_ms`]: summarise("ms", seen.reportMs),
        [`${fixture.name}.tokens_per_batch`]: single(
          "count",
          seen.tokens[0] ?? 0
        ),
        ...stepMetrics(fixture.name, seen.spans),
      });
    }

    return {
      metrics: {
        ...metrics,
        judge_calls_per_bench_batch: single(
          "count",
          judge.calls() / settings.reps
        ),
        judge_tokens_per_bench_batch: single(
          "count",
          judge.tokens() / settings.reps
        ),
      },
      settings: { ...settings, targetRoot },
      suite: "runner",
    };
  } finally {
    judge.restore();
    await stack.teardown();
  }
};

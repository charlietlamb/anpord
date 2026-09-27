import { informational, type Metric } from "../report/metric";
import { median, percentile, single, summarise } from "../report/stats";
import { inRounds } from "../stack/paired";
import type { Stack } from "../stack/stack";
import type { Endpoint, Workload } from "./endpoints";
import { type Credentials, drive, type LoadResult } from "./load";

export interface MeasureSettings {
  readonly concurrency: number;
  readonly requests: number;
  readonly rounds: number;
  readonly sequential: number;
  readonly warmup: number;
}

interface Lane {
  readonly credentials: Credentials;
  readonly loaded: LoadResult[];
  offset: number;
  queries: number;
  readonly sequential: LoadResult[];
  readonly stack: Stack;
  readonly warmup: LoadResult[];
  readonly workload: Workload;
}

const latencies = (result: LoadResult) =>
  result.samples.map((sample) => sample.ms);

const perRound = (results: readonly LoadResult[], rank: number) =>
  results.map((result) => percentile(latencies(result), rank));

const laneMetrics = (name: string, lane: Lane): Record<string, Metric> => {
  const loaded = lane.loaded.flatMap((result) => result.samples);
  const sequentialCount = lane.sequential.reduce(
    (total, result) => total + result.samples.length,
    0
  );
  return {
    [`${name}.c1_p50_ms`]: summarise("ms", perRound(lane.sequential, 50)),
    [`${name}.p50_ms`]: summarise("ms", perRound(lane.loaded, 50)),
    [`${name}.p95_ms`]: summarise("ms", perRound(lane.loaded, 95)),
    [`${name}.p99_ms`]: informational(
      summarise("ms", perRound(lane.loaded, 99))
    ),
    [`${name}.rps`]: summarise(
      "rps",
      lane.loaded.map(
        (result) => (result.samples.length / result.wallMs) * 1000
      )
    ),
    [`${name}.error_rate`]: single(
      "ratio",
      loaded.filter((sample) => !sample.ok).length / loaded.length
    ),
    [`${name}.queries_per_request`]: single(
      "count",
      lane.queries / sequentialCount
    ),
    [`${name}.response_bytes`]: single(
      "bytes",
      percentile(
        loaded.map((sample) => sample.bytes),
        50
      )
    ),
  };
};

const openLane = async (stack: Stack, endpoint: Endpoint): Promise<Lane> => {
  if (stack.world === null) {
    throw new Error("The server suite needs a seeded world.");
  }
  return {
    credentials: {
      apiKey: stack.tenant.apiKey,
      baseUrl: stack.server.baseUrl,
      cookie: stack.tenant.cookie,
    },
    loaded: [],
    offset: 0,
    queries: 0,
    sequential: [],
    stack,
    warmup: [],
    workload: await endpoint.prepare(stack, stack.world),
  };
};

const run = async (lane: Lane, count: number, concurrency: number) => {
  const result = await drive(
    lane.workload,
    lane.credentials,
    lane.offset,
    count,
    concurrency
  );
  lane.offset += count;
  return result;
};

const assertNoFailures = (name: string, lanes: readonly Lane[]) => {
  const failed = lanes.flatMap((lane) =>
    [...lane.warmup, ...lane.sequential, ...lane.loaded].flatMap((result) =>
      result.samples.filter((sample) => !sample.ok)
    )
  );
  if (failed.length > 0) {
    throw new Error(
      `${name}: ${failed.length} requests failed, so its numbers would not be comparable. First: ${failed[0]?.failure}`
    );
  }
};

export const measureEndpoint = async (
  stacks: readonly Stack[],
  endpoint: Endpoint,
  settings: MeasureSettings,
  log: (line: string) => void
) => {
  const budget = endpoint.budget?.(settings) ?? settings;
  const sequential = Math.floor(budget.sequential / settings.rounds);
  const requests = Math.floor(budget.requests / settings.rounds);
  const concurrency = Math.min(
    settings.concurrency,
    endpoint.concurrency ?? settings.concurrency
  );
  const lanes: Lane[] = [];
  for (const stack of stacks) {
    lanes.push(await openLane(stack, endpoint));
  }

  for (const lane of lanes) {
    lane.warmup.push(await run(lane, budget.warmup, 1));
  }
  await inRounds(settings.rounds, lanes, async (lane) => {
    const before = await lane.stack.server.queries();
    lane.sequential.push(await run(lane, sequential, 1));
    lane.queries += (await lane.stack.server.queries()) - before;
    lane.loaded.push(await run(lane, requests, concurrency));
  });
  for (const lane of lanes) {
    await lane.workload.cleanup?.();
  }

  assertNoFailures(endpoint.name, lanes);
  log(
    `  ${endpoint.name}: p50 ${lanes
      .map((lane) => `${median(perRound(lane.loaded, 50)).toFixed(1)} ms`)
      .join(" vs ")}`
  );
  return lanes.map((lane) => laneMetrics(endpoint.name, lane));
};

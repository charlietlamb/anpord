import type { Metric, SuiteResult } from "../report/metric";
import { percentile, single, summarise } from "../report/stats";
import { DEFAULT_PLAN, type SeedPlan } from "../seed/plan";
import { startServer } from "../stack/server";
import { bootStack, type Stack } from "../stack/stack";
import { ENDPOINTS, type Endpoint } from "./endpoints";
import { type Credentials, drive, type LoadResult } from "./load";

export interface ServerSettings {
  readonly coldStarts: number;
  readonly concurrency: number;
  readonly endpoints: readonly string[] | null;
  readonly plan: SeedPlan;
  readonly requests: number;
  readonly sequential: number;
  readonly warmup: number;
}

export const DEFAULT_SERVER_SETTINGS: ServerSettings = {
  coldStarts: 5,
  concurrency: 8,
  endpoints: null,
  plan: DEFAULT_PLAN,
  requests: 300,
  sequential: 30,
  warmup: 20,
};

const MEMORY_EVERY_MS = 100;

const sampleMemory = (stack: Stack) => {
  let peakRss = 0;
  let peakHeap = 0;
  let stopped = false;
  const loop = (async () => {
    while (!stopped) {
      const memory = await stack.server
        .memory()
        .catch(() => ({ heapUsed: 0, rss: 0 }));
      peakRss = Math.max(peakRss, memory.rss);
      peakHeap = Math.max(peakHeap, memory.heapUsed);
      await new Promise((resolve) => setTimeout(resolve, MEMORY_EVERY_MS));
    }
  })();
  return async () => {
    stopped = true;
    await loop;
    return { peakHeap, peakRss };
  };
};

const peakMetrics = async (
  stop: () => Promise<{ peakHeap: number; peakRss: number }>
) => {
  const peak = await stop();
  return {
    heap_peak_bytes: single("bytes", peak.peakHeap),
    rss_peak_bytes: single("bytes", peak.peakRss),
  };
};

const latencies = (result: LoadResult) =>
  result.samples.map((sample) => sample.ms);

const endpointMetrics = (
  name: string,
  sequential: LoadResult,
  loaded: LoadResult,
  queries: number
): Record<string, Metric> => {
  const measured = latencies(loaded);
  const errors = loaded.samples.filter((sample) => !sample.ok).length;
  return {
    [`${name}.c1_p50_ms`]: single("ms", percentile(latencies(sequential), 50)),
    [`${name}.p50_ms`]: single("ms", percentile(measured, 50)),
    [`${name}.p95_ms`]: single("ms", percentile(measured, 95)),
    [`${name}.p99_ms`]: single("ms", percentile(measured, 99)),
    [`${name}.rps`]: single(
      "rps",
      (loaded.samples.length / loaded.wallMs) * 1000
    ),
    [`${name}.error_rate`]: single("ratio", errors / loaded.samples.length),
    [`${name}.queries_per_request`]: single(
      "count",
      queries / sequential.samples.length
    ),
    [`${name}.response_bytes`]: single(
      "bytes",
      percentile(
        loaded.samples.map((sample) => sample.bytes),
        50
      )
    ),
  };
};

const measureEndpoint = async (
  stack: Stack,
  endpoint: Endpoint,
  settings: ServerSettings,
  log: (line: string) => void
) => {
  const world = stack.world;
  if (world === null) {
    throw new Error("The server suite needs a seeded world.");
  }
  const credentials: Credentials = {
    apiKey: stack.tenant.apiKey,
    baseUrl: stack.server.baseUrl,
    cookie: stack.tenant.cookie,
  };
  const budget = endpoint.budget ?? settings;
  const workload = await endpoint.prepare(
    stack,
    world,
    budget.warmup + budget.sequential + budget.requests
  );

  await drive(workload, credentials, 0, budget.warmup, 1);
  const before = await stack.server.queries();
  const sequential = await drive(
    workload,
    credentials,
    budget.warmup,
    budget.sequential,
    1
  );
  const queries = (await stack.server.queries()) - before;
  const loaded = await drive(
    workload,
    credentials,
    budget.warmup + budget.sequential,
    budget.requests,
    Math.min(settings.concurrency, endpoint.concurrency ?? settings.concurrency)
  );
  await workload.cleanup?.();

  const failed = [...sequential.samples, ...loaded.samples].filter(
    (sample) => !sample.ok
  );
  if (failed.length > 0) {
    throw new Error(
      `${endpoint.name}: ${failed.length} requests failed, so its numbers would not be comparable. First: ${failed[0]?.failure}`
    );
  }
  log(
    `  ${endpoint.name}: p50 ${percentile(latencies(loaded), 50).toFixed(1)} ms`
  );
  return endpointMetrics(endpoint.name, sequential, loaded, queries);
};

const coldStarts = async (
  stack: Stack,
  repositoryRoot: string,
  count: number
) => {
  const timings: number[] = [];
  for (let index = 0; index < count; index += 1) {
    const server = await startServer({
      databaseUrl: stack.database.url,
      repositoryRoot,
    });
    timings.push(server.coldStartMs);
    await server.stop();
  }
  return timings;
};

export const runServerSuite = async (
  repositoryRoot: string,
  settings: ServerSettings,
  log: (line: string) => void
): Promise<SuiteResult> => {
  log("server: creating scratch database and seeding");
  const stack = await bootStack({
    label: "server",
    plan: settings.plan,
    repositoryRoot,
  });
  try {
    log(`server: seeded in ${(stack.seedMs / 1000).toFixed(1)} s`);
    const idle = await stack.server.memory();
    const selected = ENDPOINTS.filter(
      (endpoint) =>
        settings.endpoints === null ||
        settings.endpoints.includes(endpoint.name)
    );

    const metrics: Record<string, Metric> = {};
    const stopSampling = sampleMemory(stack);
    try {
      for (const endpoint of selected) {
        Object.assign(
          metrics,
          await measureEndpoint(stack, endpoint, settings, log)
        );
      }
    } finally {
      Object.assign(metrics, await peakMetrics(stopSampling));
    }

    log("server: timing cold starts");
    return {
      metrics: {
        cold_start_ms: summarise(
          "ms",
          await coldStarts(stack, repositoryRoot, settings.coldStarts)
        ),
        seed_ms: single("ms", stack.seedMs),
        rss_after_seed_bytes: single("bytes", idle.rss),
        heap_after_seed_bytes: single("bytes", idle.heapUsed),
        ...metrics,
      },
      settings: { ...settings },
      suite: "server",
    };
  } finally {
    await stack.teardown();
  }
};

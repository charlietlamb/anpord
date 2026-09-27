import {
  MAX_ORGANIZATION_RUNS_IN_FLIGHT,
  MAX_RUN_TRIALS,
  MAX_START_TRIALS,
} from "@anpord/schema/domain/eval-quota";
import type { StartedBatch } from "@anpord/schema/domain/evals";
import { mapLimit } from "../concurrency";
import { JOURNAL_EPOCH, trialReport } from "../seed/journal";
import { suiteRequest } from "../seed/plan";
import { seeded } from "../seed/random";
import type { SeededWorld } from "../seed/seed";
import type { Stack } from "../stack/stack";

export interface RequestSpec {
  readonly auth: "cookie" | "key";
  readonly body?: unknown;
  readonly method: "GET" | "POST";
  readonly path: string;
}

type Requests = (index: number) => RequestSpec;

interface Budget {
  readonly requests: number;
  readonly sequential: number;
  readonly warmup: number;
}

export interface Workload {
  readonly cleanup?: () => Promise<void>;
  readonly requests: Requests;
  readonly settle?: (body: string) => Promise<void>;
}

export interface Endpoint {
  readonly budget?: (settings: Budget) => Budget;
  readonly concurrency?: number;
  readonly name: string;
  readonly prepare: (stack: Stack, world: SeededWorld) => Promise<Workload>;
}

const REPORT_EVENTS = 40;
const REPORT_TRIALS = MAX_START_TRIALS;
const REPORT_CASES = MAX_RUN_TRIALS / REPORT_TRIALS;
const REPORT_BATCHES = MAX_ORGANIZATION_RUNS_IN_FLIGHT;
const REPORT_WARMUP = 10;
const REPORT_SEQUENTIAL = 20;
const REPORT_SLOTS = REPORT_BATCHES * REPORT_CASES * REPORT_TRIALS;
const REPORT_BUDGET: Budget = {
  requests: REPORT_SLOTS - REPORT_WARMUP - REPORT_SEQUENTIAL,
  sequential: REPORT_SEQUENTIAL,
  warmup: REPORT_WARMUP,
};

if (!Number.isInteger(REPORT_CASES)) {
  throw new Error(
    `runner.report needs MAX_RUN_TRIALS (${MAX_RUN_TRIALS}) to be a multiple of MAX_START_TRIALS (${REPORT_TRIALS}).`
  );
}
const START_CONCURRENCY = MAX_ORGANIZATION_RUNS_IN_FLIGHT - 1;

const at = <T>(items: readonly T[], index: number) =>
  items[index % items.length] as T;

const v1 =
  (endpoint: string, body: (index: number) => unknown): Requests =>
  (index) => ({
    auth: "key",
    body: body(index),
    method: "POST",
    path: `/v1/${endpoint}`,
  });

const internal =
  (path: (index: number) => string): Requests =>
  (index) => ({
    auth: "cookie",
    method: "GET",
    path: path(index),
  });

const read = (
  name: string,
  requests: (world: SeededWorld) => Requests
): Endpoint => ({
  name,
  prepare: (_stack, world) => Promise.resolve({ requests: requests(world) }),
});

const finish = (stack: Stack, id: string) =>
  stack.call("runner.finish", { id });

const runs = (world: SeededWorld) =>
  world.batches.flatMap((batch) => batch.runs);

const startEndpoint: Endpoint = {
  concurrency: START_CONCURRENCY,
  name: "runner.start",
  prepare: (stack) =>
    Promise.resolve({
      requests: v1("runner.start", (index) =>
        suiteRequest(stack.template, `perf-start-${index % 8}`, 1, 1, 1)
      ),
      settle: async (body) => {
        await finish(stack, (JSON.parse(body) as StartedBatch).id);
      },
    }),
};

const reportEndpoint: Endpoint = {
  budget: (settings) =>
    settings.warmup + settings.sequential + settings.requests <= REPORT_SLOTS
      ? settings
      : REPORT_BUDGET,
  name: "runner.report",
  prepare: async (stack) => {
    const batches = await mapLimit(
      Array.from({ length: REPORT_BATCHES }, (_, index) => index),
      REPORT_BATCHES,
      (index) =>
        stack.call<StartedBatch>(
          "runner.start",
          suiteRequest(
            stack.template,
            `perf-report-${index}`,
            REPORT_CASES,
            1,
            REPORT_TRIALS
          )
        )
    );
    const slots = batches.flatMap((batch) =>
      batch.runs.flatMap((run) =>
        Array.from({ length: REPORT_TRIALS }, (_, trial) => ({
          ordinal: trial + 1,
          runId: run.id,
        }))
      )
    );
    return {
      cleanup: async () => {
        await Promise.all(batches.map((batch) => finish(stack, batch.id)));
      },
      requests: v1("runner.report", (index) =>
        trialReport(
          seeded(index + 1),
          REPORT_EVENTS,
          JOURNAL_EPOCH + index,
          at(slots, index),
          `perf-report-${index}`
        )
      ),
    };
  },
};

export const ENDPOINTS: readonly Endpoint[] = [
  read("auth.whoami", () => v1("auth.whoami", () => ({}))),
  read("prompts.list", () => v1("prompts.list", () => ({}))),
  read("prompts.get", (world) =>
    v1("prompts.get", (index) => ({ id: at(world.prompts, index) }))
  ),
  read("api.prompts", () => internal(() => "/api/prompts")),
  read("batches.list", () => v1("evals.batches.list", () => ({}))),
  read("batches.get", (world) =>
    v1("evals.batches.get", (index) => ({ id: at(world.batches, index).id }))
  ),
  read("api.batch", (world) =>
    internal((index) => `/api/evals/batches/${at(world.batches, index).id}`)
  ),
  read("runs.get", (world) =>
    v1("evals.runs.get", (index) => ({ id: at(runs(world), index).id }))
  ),
  read("api.run", (world) =>
    internal((index) => `/api/evals/runs/${at(runs(world), index).id}`)
  ),
  read("api.run.large-journal", (world) =>
    internal(() => `/api/evals/runs/${world.large.runId}`)
  ),
  read("api.trial", (world) =>
    internal(() => `/api/evals/trials/${world.large.trialId}`)
  ),
  read("cases.list", () => v1("evals.cases.list", () => ({}))),
  read("cases.get", (world) =>
    v1("evals.cases.get", (index) => ({ id: at(world.cases, index) }))
  ),
  read("api.cases", () => internal(() => "/api/evals/cases")),
  read("api.case", (world) =>
    internal((index) => `/api/evals/cases/${at(world.cases, index)}`)
  ),
  read("api.case.runs", (world) =>
    internal((index) => `/api/evals/cases/${at(world.cases, index)}/runs`)
  ),
  read("api.suites", () => internal(() => "/api/evals/suites")),
  read("runner.tail", (world) =>
    v1("runner.tail", (index) => ({
      after: [],
      id: at(world.batches, index).id,
    }))
  ),
  read("runner.tail.large-journal", (world) =>
    v1("runner.tail", () => ({ after: [], id: world.large.batchId }))
  ),
  startEndpoint,
  reportEndpoint,
];

export const selectEndpoints = (names: readonly string[] | null) => {
  if (names === null) {
    return ENDPOINTS;
  }
  const unknown = names.filter(
    (name) => !ENDPOINTS.some((endpoint) => endpoint.name === name)
  );
  if (unknown.length > 0) {
    throw new Error(`No endpoint called ${unknown.join(", ")}.`);
  }
  return ENDPOINTS.filter((endpoint) => names.includes(endpoint.name));
};

import type { StartedBatch } from "@anpord/schema/domain/evals";
import { mapLimit } from "../concurrency";
import { journal, outcome, trialUsage } from "../seed/journal";
import { suiteRequest } from "../seed/plan";
import { seeded } from "../seed/random";
import type { SeededWorld } from "../seed/seed";
import { callV1 } from "../stack/api";
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
  readonly budget?: Budget;
  readonly concurrency?: number;
  readonly name: string;
  readonly prepare: (
    stack: Stack,
    world: SeededWorld,
    count: number
  ) => Promise<Workload>;
}

const REPORT_EVENTS = 40;
const REPORT_CASES = 10;
const REPORT_TRIALS = 10;
const REPORT_BATCHES = 3;
const REPORT_WARMUP = 10;
const REPORT_SEQUENTIAL = 20;
const START_CONCURRENCY = 2;

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
  callV1(stack.server.baseUrl, stack.tenant.apiKey, "runner.finish", { id });

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
  budget: {
    requests:
      REPORT_BATCHES * REPORT_CASES * REPORT_TRIALS -
      REPORT_WARMUP -
      REPORT_SEQUENTIAL,
    sequential: REPORT_SEQUENTIAL,
    warmup: REPORT_WARMUP,
  },
  name: "runner.report",
  prepare: async (stack) => {
    const batches = await mapLimit(
      Array.from({ length: REPORT_BATCHES }, (_, index) => index),
      REPORT_BATCHES,
      (index) =>
        callV1<StartedBatch>(
          stack.server.baseUrl,
          stack.tenant.apiKey,
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
    const requests = v1("runner.report", (index) => {
      const slot = at(slots, index);
      const random = seeded(index + 1);
      const events = journal(
        random,
        REPORT_EVENTS,
        Date.UTC(2026, 8, 1) + index
      );
      return {
        events,
        ordinal: slot.ordinal,
        outcome: outcome(random, events),
        runId: slot.runId,
        sandboxId: `perf-report-${index}`,
        usage: trialUsage(random),
      };
    });
    return {
      cleanup: async () => {
        await Promise.all(batches.map((batch) => finish(stack, batch.id)));
      },
      requests,
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
